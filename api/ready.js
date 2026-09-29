export default function handler(_req, res) {
  res.status(200).json({
    status: "ready",
    deployment: "vercel-ui-prototype",
    model_version: "vercel-ui-prototype-not-dinov2",
    encoder_loaded: false,
    gallery_ready: false,
    ranking: "demo_block_color",
    note: "DINOv2-L/14 strong weight is 1.2 GB and is not deployed on Vercel. Browser pages use a local demo store.",
  });
}
