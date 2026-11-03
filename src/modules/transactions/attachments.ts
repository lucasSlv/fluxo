import "server-only";
import { GridFSBucket, ObjectId } from "mongodb";
import mongoose, { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db";
import { AppError, notFound } from "@/lib/errors";
import { Transaction } from "@/models";
import { assertOwned } from "@/modules/shared/ownership";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
const MAX_PER_TX = 5;

async function bucket() {
  await connectDB();
  return new GridFSBucket(mongoose.connection.db!, { bucketName: "attachments" });
}

/** Armazena comprovantes no GridFS, vinculados à movimentação e ao usuário. */
export async function addAttachment(userId: string, transactionId: string, file: File) {
  const tx = await assertOwned(Transaction, userId, transactionId, "Movimentação");
  if (!ALLOWED.includes(file.type)) throw new AppError("VALIDATION", "Formato não suportado. Envie PDF, PNG, JPG ou WEBP.");
  if (file.size > MAX_SIZE) throw new AppError("VALIDATION", "Arquivo maior que 5 MB.");
  if ((tx.attachments?.length ?? 0) >= MAX_PER_TX) throw new AppError("VALIDATION", `Máximo de ${MAX_PER_TX} anexos por movimentação.`);
  const b = await bucket();
  const filename = file.name.replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "anexo";
  const upload = b.openUploadStream(filename, { metadata: { userId: new ObjectId(userId), transactionId: new ObjectId(transactionId), contentType: file.type } });
  const buf = Buffer.from(await file.arrayBuffer());
  await new Promise<void>((resolve, reject) => upload.end(buf, (err?: Error | null) => (err ? reject(err) : resolve())));
  const meta = { fileId: upload.id, filename, contentType: file.type, size: file.size };
  await Transaction.updateOne({ _id: transactionId, userId }, { $push: { attachments: meta } });
  return { fileId: String(upload.id) };
}

export async function readAttachment(userId: string, fileId: string) {
  if (!isValidObjectId(fileId)) throw notFound("Anexo");
  const b = await bucket();
  const [file] = await b.find({ _id: new ObjectId(fileId), "metadata.userId": new ObjectId(userId) }).toArray();
  if (!file) throw notFound("Anexo");
  return { file, stream: b.openDownloadStream(file._id) };
}

export async function deleteAttachment(userId: string, transactionId: string, fileId: string) {
  await assertOwned(Transaction, userId, transactionId, "Movimentação");
  if (!isValidObjectId(fileId)) throw notFound("Anexo");
  const b = await bucket();
  const [file] = await b.find({ _id: new ObjectId(fileId), "metadata.userId": new ObjectId(userId) }).toArray();
  if (file) await b.delete(file._id);
  await Transaction.updateOne({ _id: transactionId, userId }, { $pull: { attachments: { fileId: new ObjectId(fileId) } } });
}
