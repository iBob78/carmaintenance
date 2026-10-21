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
      // Modèle linguistique « best_int » (le plus précis) — même modèle que la
      // suite de tests. Téléchargé une fois puis mis en cache par le navigateur.
      const LANG_BEST = 'https://cdn.jsdelivr.net/npm/@tesseract.js-data/fra/4.0.0_best_int'
      try {
        const worker = await createWorker('fra', 1, { langPath: LANG_BEST })
        await worker.setParameters({ preserve_interword_spaces: '1' })
        return worker
      } catch {
        // Repli : modèle par défaut si le CDN est inaccessible
        const worker = await createWorker('fra')
        await worker.setParameters({ preserve_interword_spaces: '1' })
        return worker
      }
    })()
  }
  return workerPromise
}

/**
 * Reconnaît le texte d'une image (photo de carte grise, facture…).
 * Exécution 100 % locale dans le navigateur.
 * Deux passes de segmentation (PSM 3 « automatique » et PSM 6 « bloc de
 * texte ») car elles ratent des champs différents sur un document dense —
 * les textes sont fusionnés pour offrir le meilleur des deux au parseur.
 */
export async function recognizeImage(image: File | Blob): Promise<RecognizeResult> {
  const worker = await getWorker()
  const { PSM } = await import('tesseract.js')
  await worker.setParameters({ preserve_interword_spaces: '1', tessedit_pageseg_mode: PSM.AUTO })
  const pass1 = await worker.recognize(image)
  await worker.setParameters({ preserve_interword_spaces: '1', tessedit_pageseg_mode: PSM.SINGLE_BLOCK })
  const pass2 = await worker.recognize(image)
  return {
    text: `${pass1.data.text ?? ''}\n${pass2.data.text ?? ''}`,
    confidence: ((pass1.data.confidence ?? 0) + (pass2.data.confidence ?? 0)) / 2,
  }
}

/** Libère le worker OCR (fin de session). */
export async function terminateOcr(): Promise<void> {
  if (workerPromise) {
    const w = await workerPromise
    await w.terminate()
    workerPromise = null
  }
}
