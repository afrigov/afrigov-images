import sharp from "sharp";

/**
 * A photograph-like test image: smooth colour with fine noise, so it compresses the way a real
 * photograph does. Optionally with GPS data in its EXIF, as a phone would write it.
 */
export async function photo(
  path: string,
  width: number,
  height: number,
  options: { gps?: boolean; format?: "jpeg" | "png" } = {},
): Promise<void> {
  const channels = 3;
  const data = Buffer.alloc(width * height * channels);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const n = (Math.random() - 0.5) * 40;
      data[i] = Math.max(0, Math.min(255, (x / width) * 200 + 30 + n));
      data[i + 1] = Math.max(0, Math.min(255, (y / height) * 160 + 60 + n));
      data[i + 2] = Math.max(0, Math.min(255, 140 + Math.sin(x / 40) * 60 + n));
    }
  }
  let img = sharp(data, { raw: { width, height, channels } });
  if (options.gps) {
    img = img.withExif({
      IFD0: { Make: "TestPhone", Model: "T1" },
      IFD3: {
        GPSLatitudeRef: "N",
        GPSLatitude: "5/1 36/1 0/1",
        GPSLongitudeRef: "W",
        GPSLongitude: "0/1 11/1 0/1",
      },
    });
  }
  await (options.format === "png" ? img.png() : img.jpeg({ quality: 92 })).toFile(path);
}
