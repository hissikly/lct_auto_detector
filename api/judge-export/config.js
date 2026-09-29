export default function handler(_req, res) {
  res.status(200).json({
    enabled: false,
    downloads: ["candidates.csv", "embeddings.npy", "manifest.json", "submission.csv"],
    detail: "На Vercel модель не запускается: вес strong DINOv2-L/14 занимает 1,2 ГБ и не помещается в serverless. Файлы embeddings.npy, submission.csv и candidates.csv собирает локальный прототип или консольная команда из JUDGE_EXPORT.md.",
  });
}
