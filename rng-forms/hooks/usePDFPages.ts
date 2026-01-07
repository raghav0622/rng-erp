'use client';

import { PDFDocument, degrees } from 'pdf-lib';
import { useCallback, useEffect, useState } from 'react';
import { globalLogger } from '../../lib';

export interface PDFPageState {
  index: number;
  rotation: number;
  deleted: boolean;
}

export function usePDFPages(pdfFile: File | null) {
  const [pages, setPages] = useState<PDFPageState[]>([]);
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  const [history, setHistory] = useState<PDFPageState[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Initialize pages when file changes
  useEffect(() => {
    const initializePages = async () => {
      if (!pdfFile) {
        setPages([]);
        return;
      }

      try {
        const pdfDoc = await PDFDocument.load(await pdfFile.arrayBuffer());
        const pageCount = pdfDoc.getPageCount();
        const newPages: PDFPageState[] = Array.from({ length: pageCount }, (_, i) => ({
          index: i,
          rotation: 0,
          deleted: false,
        }));
        setPages(newPages);
        setHistory([newPages]);
        setHistoryIndex(0);
      } catch (error) {
        globalLogger.error('Error initializing PDF pages:', { error });
      }
    };

    initializePages();
  }, [pdfFile]);

  const pushToHistory = useCallback(
    (newPages: PDFPageState[]) => {
      setHistory((prev) => [...prev.slice(0, historyIndex + 1), newPages]);
      setHistoryIndex((prev) => prev + 1);
      setPages(newPages);
    },
    [historyIndex],
  );

  const rotatePage = useCallback(
    (pageIndex: number, degrees: 90 | 180 | 270 = 90) => {
      const newPages = pages.map((p) =>
        p.index === pageIndex ? { ...p, rotation: (p.rotation + degrees) % 360 } : p,
      );
      pushToHistory(newPages);
    },
    [pages, pushToHistory],
  );

  const deletePage = useCallback(
    (pageIndex: number) => {
      const newPages = pages.map((p) => (p.index === pageIndex ? { ...p, deleted: true } : p));
      pushToHistory(newPages);
    },
    [pages, pushToHistory],
  );

  const reorderPages = useCallback(
    (fromIndex: number, toIndex: number) => {
      const fromPos = pages.findIndex((p) => p.index === fromIndex);
      const toPos = pages.findIndex((p) => p.index === toIndex);
      if (fromPos === -1 || toPos === -1) return;

      const newPages = [...pages];
      const [removed] = newPages.splice(fromPos, 1);
      if (removed) {
        newPages.splice(toPos, 0, removed);
        pushToHistory(newPages);
      }
    },
    [pages, pushToHistory],
  );

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setPages(history[newIndex]!);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setPages(history[newIndex]!);
    }
  }, [history, historyIndex]);

  const exportPDF = useCallback(async (): Promise<File> => {
    if (!pdfFile) throw new Error('No PDF file provided');

    const srcDoc = await PDFDocument.load(await pdfFile.arrayBuffer());
    const outDoc = await PDFDocument.create();

    const activePages = pages.filter((p) => !p.deleted);

    for (const pageState of activePages) {
      const copied = await outDoc.copyPages(srcDoc, [pageState.index]);
      const copiedPage = copied[0];
      if (!copiedPage) continue;
      const rot = pageState.rotation % 360;
      if (rot !== 0) {
        copiedPage.setRotation(degrees(rot));
      }
      outDoc.addPage(copiedPage);
    }

    const pdfBytes = await outDoc.save();
    const blob = new Blob([pdfBytes as unknown as ArrayBuffer], { type: 'application/pdf' });
    return new File([blob], pdfFile.name, { type: 'application/pdf' });
  }, [pdfFile, pages]);

  return {
    pages,
    selectedPageIndex,
    setSelectedPageIndex,
    rotatePage,
    deletePage,
    reorderPages,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    exportPDF,
  };
}
