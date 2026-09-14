const ips = globalThis.__modamIps || (globalThis.__modamIps = new Map());
const totals = globalThis.__modamTotals || (globalThis.__modamTotals = new Map());
const fs = require('fs');

const day = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());

const num = (m, k) => m.get(k) || 0;
const inc = (m, k) => m.set(k, num(m, k) + 1);

const ip = req =>
  String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown')
    .split(',')[0]
    .trim();

const unsafe = t =>
  /(전화번호|휴대폰번호|주민번호|학교 주소|죽여|자살|성적|누드|나체|피투성이|sexual|nude|kill|suicide)/i.test(t);

function getApiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY.trim();
  try {
    return fs.readFileSync('C:/api_key/gemini_api_key.txt', 'utf8').trim();
  } catch (error) {
    return '';
  }
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function askGemini(apiKey, prompt, ratio, model) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120000);

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        model,
        input: prompt,
        response_format: {
          type: 'image',
          mime_type: 'image/jpeg',
          aspect_ratio: ratio,
          image_size: '1K'
        }
      })
    });

    const text = await response.text();
    let data = {};

    try {
      data = text ? JSON.parse(text) : {};
    } catch (error) {
      data = {
        error: {
          message: '이미지 서버의 응답을 읽지 못했어요.'
        }
      };
    }

    return { response, data };
  } finally {
    clearTimeout(timer);
  }
}

function getGeneratedImage(data) {
  const root = data?.interaction || data;

  if (root?.output_image?.data) return root.output_image;

  const steps = Array.isArray(root?.steps) ? root.steps : [];
  for (let i = steps.length - 1; i >= 0; i--) {
    const content = Array.isArray(steps[i]?.content) ? steps[i].content : [];
    for (let j = content.length - 1; j >= 0; j--) {
      const part = content[j];
      if (part?.type === 'image' && part?.data) return part;
    }
  }

  return null;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST 요청만 사용할 수 있어요.' });
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    return res
      .status(503)
      .json({ error: 'API 키를 C:/api_key/gemini_api_key.txt 또는 Vercel 환경변수에 등록해주세요.' });
  }

  const prompt = String(req.body?.prompt || '').trim();
  const ratio = ['1:1', '16:9', '9:16'].includes(req.body?.ratio) ? req.body.ratio : '1:1';

  if (prompt.length < 10 || prompt.length > 1600) {
    return res.status(400).json({ error: '프롬프트는 10~1600자로 작성해주세요.' });
  }

  if (unsafe(prompt)) {
    return res.status(400).json({ error: '안전 약속에 맞지 않는 표현이 포함되어 있어요.' });
  }

  const date = day();
  const ipKey = `${date}:${ip(req)}`;

  // 기본값:
  // - 개인(또는 같은 IP) 하루 3장
  // - 전체 하루 총량 300장
  // 필요하면 Vercel 환경변수로 덮어쓸 수 있음.
  const perIp = Math.max(1, Number(process.env.PER_IP_DAILY_LIMIT || 3));
  const globalLimit = Math.max(1, Number(process.env.DAILY_IMAGE_LIMIT || 300));

  if (num(ips, ipKey) >= perIp) {
    return res.status(429).json({ error: '오늘 만들 수 있는 이미지를 모두 완성했어요.' });
  }

  if (num(totals, date) >= globalLimit) {
    return res.status(429).json({ error: '오늘 수업의 전체 이미지 한도에 도달했어요.' });
  }

  try {
    let result = await askGemini(apiKey, prompt, ratio, 'gemini-3.1-flash-lite-image');

    if ([429, 500, 502, 503, 504].includes(result.response.status)) {
      await wait(700);
      result = await askGemini(apiKey, prompt, ratio, 'gemini-3.1-flash-image');
    }

    const { response, data } = result;

    if (!response.ok) {
      const temporary = [429, 500, 502, 503, 504].includes(response.status);
      return res.status(temporary ? 503 : response.status).json({
        error: temporary
          ? '이미지 생성 서버가 잠시 혼잡해요. 1~2분 후 다시 눌러주세요.'
          : data?.error?.message || 'Gemini 이미지 생성 요청이 실패했어요.'
      });
    }

    const output = getGeneratedImage(data);
    if (!output?.data) {
      return res.status(502).json({
        error: 'Google이 이번 요청에서 이미지를 만들지 못했어요. 문장을 조금 바꿔 다시 눌러주세요.'
      });
    }

    inc(ips, ipKey);
    inc(totals, date);

    return res.status(200).json({
      image: output.data,
      mimeType: output.mime_type || output.mimeType || 'image/jpeg'
    });
  } catch (error) {
    const timedOut = error?.name === 'AbortError';
    return res.status(503).json({
      error: timedOut
        ? '이미지를 그리는 시간이 길어졌어요. 1~2분 후 다시 눌러주세요.'
        : '이미지 서버에 연결하지 못했어요. 잠시 후 다시 시도해주세요.'
    });
  }
};
