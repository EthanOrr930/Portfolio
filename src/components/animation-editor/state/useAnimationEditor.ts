"use client";

import { useState, useCallback } from "react";
import type {
  SceneData,
  EditorTab,
  CameraKeyframe,
  TransformKeyframe,
  ModelKeyframe,
  ModelTransition,
} from "@/lib/animation/types";

export type SelectionType =
  | { type: "none" }
  | { type: "camera-keyframe"; id: string }
  | { type: "transform-keyframe"; id: string }
  | { type: "model-keyframe"; id: string }
  | { type: "model-transition"; id: string };

export interface AnimationEditorState {
  sceneData: SceneData;
  activeTab: EditorTab;
  currentVh: number;
  selection: SelectionType;
  /** Shift-selected model keyframe IDs for creating transitions (max 2) */
  shiftSelectedIds: string[];

  // Scene data setters
  setSceneData: (data: SceneData) => void;
  setActiveTab: (tab: EditorTab) => void;
  setCurrentVh: (vh: number) => void;
  setSelection: (sel: SelectionType) => void;
  toggleShiftSelect: (id: string) => void;
  clearShiftSelect: () => void;

  // Camera keyframe operations
  addCameraKeyframe: (kf: CameraKeyframe) => void;
  updateCameraKeyframe: (id: string, updates: Partial<CameraKeyframe>) => void;
  deleteCameraKeyframe: (id: string) => void;

  // Transform keyframe operations
  addTransformKeyframe: (kf: TransformKeyframe) => void;
  updateTransformKeyframe: (
    id: string,
    updates: Partial<TransformKeyframe>,
  ) => void;
  deleteTransformKeyframe: (id: string) => void;

  // Model keyframe operations
  addModelKeyframe: (kf: ModelKeyframe) => void;
  updateModelKeyframe: (id: string, updates: Partial<ModelKeyframe>) => void;
  deleteModelKeyframe: (id: string) => void;

  // Model transition operations
  addModelTransition: (t: ModelTransition) => void;
  updateModelTransition: (
    id: string,
    updates: Partial<ModelTransition>,
  ) => void;
  deleteModelTransition: (id: string) => void;

  // Selected keyframe helpers
  getSelectedCameraKeyframe: () => CameraKeyframe | undefined;
  getSelectedTransformKeyframe: () => TransformKeyframe | undefined;
  getSelectedModelKeyframe: () => ModelKeyframe | undefined;
  getSelectedModelTransition: () => ModelTransition | undefined;
}

export function useAnimationEditor(
  initialData: SceneData,
): AnimationEditorState {
  const [sceneData, setSceneData] = useState<SceneData>(initialData);
  const [activeTab, setActiveTabRaw] = useState<EditorTab>("camera");
  const [currentVh, setCurrentVh] = useState(0);
  const [selection, setSelection] = useState<SelectionType>({ type: "none" });
  const [shiftSelectedIds, setShiftSelectedIds] = useState<string[]>([]);

  // Clear selection when switching tabs
  const setActiveTab = useCallback((tab: EditorTab) => {
    setActiveTabRaw(tab);
    setSelection({ type: "none" });
    setShiftSelectedIds([]);
  }, []);

  const toggleShiftSelect = useCallback((id: string) => {
    setShiftSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id]; // rotate: drop oldest
      return [...prev, id];
    });
  }, []);

  const clearShiftSelect = useCallback(() => {
    setShiftSelectedIds([]);
  }, []);

  // --- Camera ---
  const addCameraKeyframe = useCallback((kf: CameraKeyframe) => {
    setSceneData((prev) => ({
      ...prev,
      camera: {
        // Remove any existing keyframe at the same vh position (override)
        keyframes: [...prev.camera.keyframes.filter((k) => k.vh !== kf.vh), kf].sort((a, b) => a.vh - b.vh),
      },
    }));
  }, []);

  const updateCameraKeyframe = useCallback(
    (id: string, updates: Partial<CameraKeyframe>) => {
      setSceneData((prev) => ({
        ...prev,
        camera: {
          keyframes: prev.camera.keyframes
            .map((kf) => (kf.id === id ? { ...kf, ...updates } : kf))
            .sort((a, b) => a.vh - b.vh),
        },
      }));
    },
    [],
  );

  const deleteCameraKeyframe = useCallback((id: string) => {
    setSceneData((prev) => ({
      ...prev,
      camera: {
        keyframes: prev.camera.keyframes.filter((kf) => kf.id !== id),
      },
    }));
    setSelection((prev) =>
      prev.type === "camera-keyframe" && prev.id === id
        ? { type: "none" }
        : prev,
    );
  }, []);

  // --- Transform ---
  const addTransformKeyframe = useCallback((kf: TransformKeyframe) => {
    setSceneData((prev) => ({
      ...prev,
      transform: {
        keyframes: [...prev.transform.keyframes.filter((k) => k.vh !== kf.vh), kf].sort(
          (a, b) => a.vh - b.vh,
        ),
      },
    }));
  }, []);

  const updateTransformKeyframe = useCallback(
    (id: string, updates: Partial<TransformKeyframe>) => {
      setSceneData((prev) => ({
        ...prev,
        transform: {
          keyframes: prev.transform.keyframes
            .map((kf) => (kf.id === id ? { ...kf, ...updates } : kf))
            .sort((a, b) => a.vh - b.vh),
        },
      }));
    },
    [],
  );

  const deleteTransformKeyframe = useCallback((id: string) => {
    setSceneData((prev) => ({
      ...prev,
      transform: {
        keyframes: prev.transform.keyframes.filter((kf) => kf.id !== id),
      },
    }));
    setSelection((prev) =>
      prev.type === "transform-keyframe" && prev.id === id
        ? { type: "none" }
        : prev,
    );
  }, []);

  // --- Model ---
  const addModelKeyframe = useCallback((kf: ModelKeyframe) => {
    setSceneData((prev) => {
      // Remove any existing keyframe at the same vh (override), and clean up its transitions
      const removedIds = prev.model.keyframes
        .filter((k) => k.vh === kf.vh)
        .map((k) => k.id);
      return {
        ...prev,
        model: {
          ...prev.model,
          keyframes: [...prev.model.keyframes.filter((k) => k.vh !== kf.vh), kf].sort(
            (a, b) => a.vh - b.vh,
          ),
          transitions: prev.model.transitions.filter(
            (t) => !removedIds.includes(t.fromKeyframeId) && !removedIds.includes(t.toKeyframeId),
          ),
        },
      };
    });
  }, []);

  const updateModelKeyframe = useCallback(
    (id: string, updates: Partial<ModelKeyframe>) => {
      setSceneData((prev) => ({
        ...prev,
        model: {
          ...prev.model,
          keyframes: prev.model.keyframes
            .map((kf) => (kf.id === id ? { ...kf, ...updates } : kf))
            .sort((a, b) => a.vh - b.vh),
        },
      }));
    },
    [],
  );

  const deleteModelKeyframe = useCallback((id: string) => {
    setSceneData((prev) => ({
      ...prev,
      model: {
        ...prev.model,
        keyframes: prev.model.keyframes.filter((kf) => kf.id !== id),
        // Also remove transitions referencing this keyframe
        transitions: prev.model.transitions.filter(
          (t) => t.fromKeyframeId !== id && t.toKeyframeId !== id,
        ),
      },
    }));
    setSelection((prev) =>
      prev.type === "model-keyframe" && prev.id === id
        ? { type: "none" }
        : prev,
    );
  }, []);

  // --- Model Transitions ---
  const addModelTransition = useCallback((t: ModelTransition) => {
    setSceneData((prev) => ({
      ...prev,
      model: {
        ...prev.model,
        transitions: [...prev.model.transitions, t],
      },
    }));
  }, []);

  const updateModelTransition = useCallback(
    (id: string, updates: Partial<ModelTransition>) => {
      setSceneData((prev) => ({
        ...prev,
        model: {
          ...prev.model,
          transitions: prev.model.transitions.map((t) =>
            t.id === id ? { ...t, ...updates } : t,
          ),
        },
      }));
    },
    [],
  );

  const deleteModelTransition = useCallback((id: string) => {
    setSceneData((prev) => ({
      ...prev,
      model: {
        ...prev.model,
        transitions: prev.model.transitions.filter((t) => t.id !== id),
      },
    }));
    setSelection((prev) =>
      prev.type === "model-transition" && prev.id === id
        ? { type: "none" }
        : prev,
    );
  }, []);

  // --- Selected getters ---
  const getSelectedCameraKeyframe = useCallback(() => {
    if (selection.type !== "camera-keyframe") return undefined;
    return sceneData.camera.keyframes.find((kf) => kf.id === selection.id);
  }, [sceneData, selection]);

  const getSelectedTransformKeyframe = useCallback(() => {
    if (selection.type !== "transform-keyframe") return undefined;
    return sceneData.transform.keyframes.find((kf) => kf.id === selection.id);
  }, [sceneData, selection]);

  const getSelectedModelKeyframe = useCallback(() => {
    if (selection.type !== "model-keyframe") return undefined;
    return sceneData.model.keyframes.find((kf) => kf.id === selection.id);
  }, [sceneData, selection]);

  const getSelectedModelTransition = useCallback(() => {
    if (selection.type !== "model-transition") return undefined;
    return sceneData.model.transitions.find((t) => t.id === selection.id);
  }, [sceneData, selection]);

  return {
    sceneData,
    activeTab,
    currentVh,
    selection,
    shiftSelectedIds,
    setSceneData,
    setActiveTab,
    setCurrentVh,
    setSelection,
    toggleShiftSelect,
    clearShiftSelect,
    addCameraKeyframe,
    updateCameraKeyframe,
    deleteCameraKeyframe,
    addTransformKeyframe,
    updateTransformKeyframe,
    deleteTransformKeyframe,
    addModelKeyframe,
    updateModelKeyframe,
    deleteModelKeyframe,
    addModelTransition,
    updateModelTransition,
    deleteModelTransition,
    getSelectedCameraKeyframe,
    getSelectedTransformKeyframe,
    getSelectedModelKeyframe,
    getSelectedModelTransition,
  };
}
