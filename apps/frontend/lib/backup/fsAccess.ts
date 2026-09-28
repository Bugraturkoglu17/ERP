// Firma kontrollü yerel yedekleme — File System Access API sarmalayıcıları.
// Yalnızca Chrome/Edge masaüstünde mevcuttur; Safari/Firefox'ta hiç
// gösterilmez (bkz. sistem-yedegi/page.tsx feature-detect).

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== "undefined" && typeof window.showDirectoryPicker === "function";
}

export async function pickBackupDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (!isFileSystemAccessSupported()) return null;
  try {
    return await window.showDirectoryPicker!({ id: "sismik-backup", mode: "readwrite" });
  } catch (err) {
    // Kullanıcı seçim penceresini iptal etti (AbortError) — hata değil.
    if (err instanceof DOMException && err.name === "AbortError") return null;
    throw err;
  }
}

/**
 * Klasör seçiminden HEMEN sonra çağrılır — showDirectoryPicker({mode:"readwrite"})
 * başarıyla dönse BİLE, Chromium; Masaüstü, Belgeler, İndirilenler, Resimler,
 * Müzik, Videolar veya kullanıcının ana klasörü gibi "tehlikeli" sistem
 * klasörlerinin DOĞRUDAN seçilmesinde gerçek yazma iznini sessizce reddeder.
 * Bu durumda okuma (manifest okuma, bütünlük kontrolü) ve hatta klasör seçimi
 * SORUNSUZ görünür — ilk gerçek dosya yazımı derinlerde "NotAllowedError"
 * ile patlar. Bunu erkenden yakalamak için burada izin açıkça doğrulanır.
 */
export async function verifyReadWritePermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  const opts = { mode: "readwrite" as const };
  try {
    if ((await handle.queryPermission?.(opts)) === "granted") return true;
    if ((await handle.requestPermission?.(opts)) === "granted") return true;
  } catch {
    // requestPermission bir kullanıcı jesti dışında çağrılırsa hata fırlatabilir.
  }
  return false;
}

async function ensureSubdirectory(root: FileSystemDirectoryHandle, path: string): Promise<FileSystemDirectoryHandle> {
  const parts = path.split("/").filter(Boolean);
  let dir = root;
  for (const part of parts) {
    dir = await dir.getDirectoryHandle(part, { create: true });
  }
  return dir;
}

function splitDirAndName(relativePath: string): { dir: string; name: string } {
  const idx = relativePath.lastIndexOf("/");
  return idx === -1 ? { dir: "", name: relativePath } : { dir: relativePath.slice(0, idx), name: relativePath.slice(idx + 1) };
}

/**
 * Bir ReadableStream'i (fetch response body) doğrudan diske YAZAR — hiçbir
 * anda dosyanın tamamı RAM'e alınmaz (1 TB'lık yedeklerde bellek şişmesin
 * diye). Geçici olarak `<isim>.partial` adıyla yazılır; başarıyla bitince
 * gerçek isme taşınır (kesinti durumunda yarım dosya asla "tamam" sanılmaz).
 *
 * `onBytes` her chunk sonrası çağrılır — gerçek byte sayacı için (fake
 * timer YOK).
 */
export async function writeStreamToFile(
  root: FileSystemDirectoryHandle,
  relativePath: string,
  stream: ReadableStream<Uint8Array>,
  onBytes?: (bytesWritten: number) => void,
): Promise<number> {
  const { dir, name } = splitDirAndName(relativePath);
  const dirHandle = dir ? await ensureSubdirectory(root, dir) : root;
  const partialName = `${name}.partial`;

  const partialHandle = await dirHandle.getFileHandle(partialName, { create: true });
  const writable = await partialHandle.createWritable();

  let total = 0;
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        // fetch/ReadableStream chunk'ları her zaman gerçek ArrayBuffer'a
        // dayanır (SharedArrayBuffer değil) — FileSystemWritableFileStream'in
        // tip tanımı bunu ayırt edemiyor, TS'i bilgilendirmek için cast.
        await writable.write(value as unknown as BufferSource);
        total += value.byteLength;
        onBytes?.(total);
      }
    }
    await writable.close();
  } catch (err) {
    await writable.abort().catch(() => undefined);
    throw err;
  }

  // .partial -> gerçek isim: File System Access API'de doğrudan "rename" yok —
  // hedefe kopyalayıp geçici olanı sil.
  const finalHandle = await dirHandle.getFileHandle(name, { create: true });
  const finalWritable = await finalHandle.createWritable();
  const partialFile = await partialHandle.getFile();
  await finalWritable.write(await partialFile.arrayBuffer());
  await finalWritable.close();
  await dirHandle.removeEntry(partialName).catch(() => undefined);

  return total;
}

/** Bir dosyanın backup klasöründe fiziksel olarak var olup olmadığını kontrol eder (bütünlük doğrulama). */
export async function fileExistsAt(root: FileSystemDirectoryHandle, relativePath: string): Promise<boolean> {
  const { dir, name } = splitDirAndName(relativePath);
  try {
    const dirHandle = dir ? await ensureSubdirectory(root, dir) : root;
    await dirHandle.getFileHandle(name);
    return true;
  } catch {
    return false;
  }
}

export async function readJsonFile<T>(root: FileSystemDirectoryHandle, relativePath: string): Promise<T | null> {
  try {
    const { dir, name } = splitDirAndName(relativePath);
    const dirHandle = dir ? await ensureSubdirectory(root, dir) : root;
    const handle = await dirHandle.getFileHandle(name);
    const file = await handle.getFile();
    const text = await file.text();
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function writeJsonFile(root: FileSystemDirectoryHandle, relativePath: string, data: unknown): Promise<void> {
  const { dir, name } = splitDirAndName(relativePath);
  const dirHandle = dir ? await ensureSubdirectory(root, dir) : root;
  const handle = await dirHandle.getFileHandle(name, { create: true });
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(data, null, 2));
  await writable.close();
}
