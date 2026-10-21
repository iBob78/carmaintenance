// OCR navigateur via tesseract.js — la photo ne quitte JAMAIS l'appareil.
// Aucun envoi de fichier vers un serveur : essentiel pour une carte grise
// (nom, adresse) ou des factures (données personnelles).

export interface RecognizeResult {
  text: string
  /** Confiance moyenne OCR (0–100) */
  confidence: number
}

let workerPromise: Promise<import('tesseract.js').Worker> | null = null

async function getWorker(): Promise<import('tesseract.js').Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import('tesseract.js')
      // Données linguistiques françaises (chargées une seule fois, mises en cache)
      const worker = await createWorker('fra')
      await worker.setParameters({ preserve_interword_spaces: '1' })
      return worker
    })()
  }
  return workerPromise
}

/**
 * Reconnaît le texte d'une image (photo de carte grise, facture…).
 * Exécution 100 % locale dans le navigateur.
 */
export async function recognizeImage(image: File | Blob): Promise<RecognizeResult> {
  const worker = await getWorker()
  const { data } = await worker.recognize(image)
  return { text: data.text ?? '', confidence: data.confidence ?? 0 }
}

/** Libère le worker OCR (fin de session). */
export async function terminateOcr(): Promise<void> {
  if (workerPromise) {
    const w = await workerPromise
    await w.terminate()
    workerPromise = null
  }
}
