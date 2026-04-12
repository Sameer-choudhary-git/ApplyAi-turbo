import 'dotenv/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { storageConfig } from '@applyai/config';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: storageConfig.endpoint,
  credentials: {
    accessKeyId: storageConfig.accessKeyId,
    secretAccessKey: storageConfig.secretAccessKey,
  },
});

export const uploadFileToR2 = async (fileBuffer: Buffer, fileName: string, contentType: string) => {
  const command = new PutObjectCommand({
    Bucket: storageConfig.bucketName,
    Key: fileName,
    Body: fileBuffer,
    ContentType: contentType,
  });

  await r2Client.send(command);
  
  return `${storageConfig.publicUrl}/${fileName}`;
};
