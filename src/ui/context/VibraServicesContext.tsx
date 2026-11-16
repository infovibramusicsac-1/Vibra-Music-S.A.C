import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  getDashboardMetrics,
  type DashboardMetrics,
} from '../../application/use-cases/GetDashboardMetrics';
import type { CustomPromptTemplate } from '../../application/use-cases/PromptScriptParser';
import {
  advancePieceStage,
  movePiecesToStage,
  movePieceToStage,
  regressPieceStage,
  toggleChecklistTask,
  togglePieceApproval,
  updatePieceContent,
} from '../../application/use-cases/PieceWorkflowUseCases';
import type {
  ContentPiece,
  RenderJob,
  VibraWorkspaceData,
} from '../../domain/entities';
import type { AiCreativePort } from '../../domain/ports/AiCreativePort';
import type { ContentRepositoryPort } from '../../domain/ports/ContentRepositoryPort';
import type { LocalMediaPort } from '../../domain/ports/LocalMediaPort';
import type { TtsEnginePort } from '../../domain/ports/TtsEnginePort';
import type { VideoBatchRendererPort } from '../../domain/ports/VideoBatchRendererPort';
import type {
  ProductionStatus,
  RoleTab,
  StudioTemplatePreset,
  SubtitlePreset,
  ThemeMode,
} from '../../domain/value-objects';
import { BrowserTtsAdapter } from '../../infrastructure/adapters/BrowserTtsAdapter';
import { HybridLocalMediaAdapter } from '../../infrastructure/adapters/HybridLocalMediaAdapter';
import { LocalContentAdapter } from '../../infrastructure/adapters/LocalContentAdapter';
import { RemotionWebRenderAdapter } from '../../infrastructure/adapters/RemotionWebRenderAdapter';
import { ServerGeminiAiAdapter } from '../../infrastructure/adapters/ServerGeminiAiAdapter';

const THEME_STORAGE_KEY = 'vibra_marketing_os_theme_v1';
const CUSTOM_TEMPLATES_STORAGE_KEY = 'vibra_marketing_os_prompt_templates_v1';
const CUSTOM_STYLE_PRESETS_KEY = 'vibra_marketing_os_style_presets_v1';

interface VibraServicesContextValue {
  workspace: VibraWorkspaceData;
  metrics: DashboardMetrics;
  activeRole: RoleTab;
  setActiveRole: (role: RoleTab) => void;
  theme: ThemeMode;
  toggleTheme: () => void;
  selectedPiece: ContentPiece | null;
  openPieceEditor: (pieceId: string) => void;
  closePieceEditor: () => void;
  createPiece: (piece: ContentPiece, openInStudio?: boolean) => void;
  customTemplates: CustomPromptTemplate[];
  saveCustomTemplate: (tpl: CustomPromptTemplate) => void;
  customStylePresets: StudioTemplatePreset[];
  saveCustomStylePreset: (preset: StudioTemplatePreset) => void;
  deleteCustomStylePreset: (presetId: string) => void;
  importCustomStylePresets: (presets: StudioTemplatePreset[]) => void;
  moveStage: (pieceId: string, stage: ProductionStatus) => void;
  moveManyToStage: (pieceIds: string[], stage: ProductionStatus) => void;
  advanceStage: (pieceId: string) => void;
  regressStage: (pieceId: string) => void;
  savePiece: (piece: ContentPiece) => void;
  toggleApproval: (pieceId: string, approved?: boolean) => void;
  toggleTask: (taskId: number) => void;
  resetPlan: () => void;
  applyBatchRenderResult: (
    pieceId: string,
    job: RenderJob,
    preset: SubtitlePreset,
    targetStage?: ProductionStatus
  ) => void;
  repositoryAdapterName: string;
  ttsEngine: TtsEnginePort;
  batchRenderer: VideoBatchRendererPort;
  localMedia: LocalMediaPort;
  aiCreative: AiCreativePort;
}

const VibraServicesContext = createContext<VibraServicesContextValue | null>(
  null
);

interface ProviderProps {
  children: React.ReactNode;
  repository?: ContentRepositoryPort;
  ttsEngine?: TtsEnginePort;
  batchRenderer?: VideoBatchRendererPort;
  localMedia?: LocalMediaPort;
  aiCreative?: AiCreativePort;
}

export const VibraServicesProvider: React.FC<ProviderProps> = ({
  children,
  repository: injectedRepo,
  ttsEngine: injectedTts,
  batchRenderer: injectedRenderer,
  localMedia: injectedLocalMedia,
  aiCreative: injectedAiCreative,
}) => {
  const repository = useMemo(
    () => injectedRepo ?? new LocalContentAdapter(),
    [injectedRepo]
  );
  const ttsEngine = useMemo(
    () => injectedTts ?? new BrowserTtsAdapter(),
    [injectedTts]
  );
  const batchRenderer = useMemo(
    () => injectedRenderer ?? new RemotionWebRenderAdapter(),
    [injectedRenderer]
  );
  const localMedia = useMemo(
    () => injectedLocalMedia ?? new HybridLocalMediaAdapter(),
    [injectedLocalMedia]
  );
  const aiCreative = useMemo(
    () => injectedAiCreative ?? new ServerGeminiAiAdapter(),
    [injectedAiCreative]
  );

  const [workspace, setWorkspace] = useState<VibraWorkspaceData>(() =>
    repository.loadWorkspace()
  );
  const [activeRole, setActiveRole] = useState<RoleTab>('coordinador');
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [customTemplates, setCustomTemplates] = useState<
    CustomPromptTemplate[]
  >(() => {
    try {
      const raw = window.localStorage.getItem(CUSTOM_TEMPLATES_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CustomPromptTemplate[]) : [];
    } catch {
      return [];
    }
  });
  const [customStylePresets, setCustomStylePresets] = useState<
    StudioTemplatePreset[]
  >(() => {
    try {
      const raw = window.localStorage.getItem(CUSTOM_STYLE_PRESETS_KEY);
      return raw ? (JSON.parse(raw) as StudioTemplatePreset[]) : [];
    } catch {
      return [];
    }
  });

  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      // ignore
    }
    return 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const persistPieces = useCallback(
    (updater: (prev: ContentPiece[]) => ContentPiece[]) => {
      setWorkspace((prev) => {
        const nextPieces = updater(prev.pieces);
        repository.savePieces(nextPieces);
        return { ...prev, pieces: nextPieces };
      });
    },
    [repository]
  );

  const moveStage = useCallback(
    (pieceId: string, stage: ProductionStatus) => {
      persistPieces((prev) => movePieceToStage(prev, pieceId, stage));
    },
    [persistPieces]
  );

  const moveManyToStage = useCallback(
    (pieceIds: string[], stage: ProductionStatus) => {
      persistPieces((prev) => movePiecesToStage(prev, pieceIds, stage));
    },
    [persistPieces]
  );

  const advanceStage = useCallback(
    (pieceId: string) => {
      persistPieces((prev) => advancePieceStage(prev, pieceId));
    },
    [persistPieces]
  );

  const regressStage = useCallback(
    (pieceId: string) => {
      persistPieces((prev) => regressPieceStage(prev, pieceId));
    },
    [persistPieces]
  );

  const savePiece = useCallback(
    (piece: ContentPiece) => {
      persistPieces((prev) => updatePieceContent(prev, piece));
    },
    [persistPieces]
  );

  const createPiece = useCallback(
    (piece: ContentPiece, openInStudio = true) => {
      persistPieces((prev) => [piece, ...prev]);
      if (openInStudio) {
        setSelectedPieceId(piece.id);
      }
    },
    [persistPieces]
  );

  const saveCustomTemplate = useCallback((tpl: CustomPromptTemplate) => {
    setCustomTemplates((prev) => {
      const next = [tpl, ...prev.filter((item) => item.id !== tpl.id)].slice(
        0,
        12
      );
      try {
        window.localStorage.setItem(
          CUSTOM_TEMPLATES_STORAGE_KEY,
          JSON.stringify(next)
        );
      } catch {
        // ignore storage quota errors
      }
      return next;
    });
  }, []);

  const persistStylePresets = useCallback((next: StudioTemplatePreset[]) => {
    try {
      window.localStorage.setItem(
        CUSTOM_STYLE_PRESETS_KEY,
        JSON.stringify(next)
      );
    } catch {
      // ignore storage quota errors
    }
  }, []);

  const saveCustomStylePreset = useCallback(
    (preset: StudioTemplatePreset) => {
      setCustomStylePresets((prev) => {
        const next = [
          { ...preset, isCustom: true },
          ...prev.filter((item) => item.id !== preset.id),
        ].slice(0, 16);
        persistStylePresets(next);
        return next;
      });
    },
    [persistStylePresets]
  );

  const deleteCustomStylePreset = useCallback(
    (presetId: string) => {
      setCustomStylePresets((prev) => {
        const next = prev.filter((item) => item.id !== presetId);
        persistStylePresets(next);
        return next;
      });
    },
    [persistStylePresets]
  );

  const importCustomStylePresets = useCallback(
    (incoming: StudioTemplatePreset[]) => {
      setCustomStylePresets((prev) => {
        const mergedMap = new Map<string, StudioTemplatePreset>();
        prev.forEach((p) => mergedMap.set(p.id, p));
        incoming.forEach((p) =>
          mergedMap.set(p.id, { ...p, isCustom: true })
        );
        const next = Array.from(mergedMap.values()).slice(0, 16);
        persistStylePresets(next);
        return next;
      });
    },
    [persistStylePresets]
  );

  const toggleApproval = useCallback(
    (pieceId: string, approved?: boolean) => {
      persistPieces((prev) => togglePieceApproval(prev, pieceId, approved));
    },
    [persistPieces]
  );

  const toggleTask = useCallback(
    (taskId: number) => {
      setWorkspace((prev) => {
        const nextTasks = toggleChecklistTask(prev.pendingTasks, taskId);
        repository.saveTasks(nextTasks);
        return { ...prev, pendingTasks: nextTasks };
      });
    },
    [repository]
  );

  const applyBatchRenderResult = useCallback(
    (
      pieceId: string,
      job: RenderJob,
      preset: SubtitlePreset,
      targetStage: ProductionStatus = 'Listo'
    ) => {
      persistPieces((prev) =>
        prev.map((p) =>
          p.id === pieceId
            ? {
                ...p,
                subtitlePreset: preset,
                lastRenderJob: job,
                status: job.status === 'completed' ? targetStage : p.status,
              }
            : p
        )
      );
    },
    [persistPieces]
  );

  const resetPlan = useCallback(() => {
    ttsEngine.stop();
    const fresh = repository.resetToSeed();
    setWorkspace(fresh);
    setSelectedPieceId(null);
  }, [repository, ttsEngine]);

  const openPieceEditor = useCallback((pieceId: string) => {
    setSelectedPieceId(pieceId);
  }, []);

  const closePieceEditor = useCallback(() => {
    ttsEngine.stop();
    setSelectedPieceId(null);
  }, [ttsEngine]);

  const selectedPiece = useMemo(
    () =>
      selectedPieceId
        ? workspace.pieces.find((p) => p.id === selectedPieceId) ?? null
        : null,
    [selectedPieceId, workspace.pieces]
  );

  const metrics = useMemo(
    () =>
      getDashboardMetrics(
        workspace.pieces,
        workspace.pendingTasks,
        workspace.pillars,
        workspace.formatTargets,
        workspace.meta.pilotClassDate
      ),
    [
      workspace.pieces,
      workspace.pendingTasks,
      workspace.pillars,
      workspace.formatTargets,
      workspace.meta.pilotClassDate,
    ]
  );

  const value: VibraServicesContextValue = {
    workspace,
    metrics,
    activeRole,
    setActiveRole,
    theme,
    toggleTheme,
    selectedPiece,
    openPieceEditor,
    closePieceEditor,
    createPiece,
    customTemplates,
    saveCustomTemplate,
    customStylePresets,
    saveCustomStylePreset,
    deleteCustomStylePreset,
    importCustomStylePresets,
    moveStage,
    moveManyToStage,
    advanceStage,
    regressStage,
    savePiece,
    toggleApproval,
    toggleTask,
    resetPlan,
    applyBatchRenderResult,
    repositoryAdapterName: repository.adapterName,
    ttsEngine,
    batchRenderer,
    localMedia,
    aiCreative,
  };

  return (
    <VibraServicesContext.Provider value={value}>
      {children}
    </VibraServicesContext.Provider>
  );
};

export function useVibraServices(): VibraServicesContextValue {
  const ctx = useContext(VibraServicesContext);
  if (!ctx) {
    throw new Error(
      'useVibraServices must be used inside VibraServicesProvider'
    );
  }
  return ctx;
}
