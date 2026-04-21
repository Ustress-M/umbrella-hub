import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL!;

export const uploadFile = async (
  file: File,
  key: string
): Promise<string> => {
  const buffer = Buffer.from(await file.arrayBuffer());

  await r2Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    })
  );

  return `${PUBLIC_URL}/${key}`;
};

export const deleteFile = async (key: string): Promise<void> => {
  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );
};

export const extractKeyFromUrl = (url: string): string => {
  return url.replace(`${PUBLIC_URL}/`, "");
};

export const generateReturnPhotoKey = (rentalId: string, filename: string): string => {
  const ext = filename.split(".").pop();
  return `returns/${rentalId}.${ext}`;
};
