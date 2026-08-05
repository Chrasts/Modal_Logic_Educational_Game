import type { GameLevel } from '../campaign'
import type { LearnChapter, LearnLesson } from '../learn'

export const w = (id: string, atoms = '', x = 100, y = 130) => ({ id, atoms, position: { x, y } })
export const edge = (from: string, to: string) => ({ from, to })
export const hints = (first: string, second: string, third: string): readonly [string, string, string] => [first, second, third]

type LessonExtras = Partial<Pick<LearnLesson, 'workedExample' | 'commonMistake' | 'diagnosticFeedback' | 'transferTask' | 'relatedLessonIds'>>

export function lesson(
  chapterId: string,
  id: string,
  title: string,
  learningObjective: string,
  concept: LearnLesson['concept'],
  task: Omit<GameLevel, 'id' | 'chapter' | 'title' | 'concept' | 'learningObjective'> & { readonly chapter?: string; readonly taskId?: string },
  lessonHints: readonly [string, string, string],
  successExplanation: string,
  extras: LessonExtras = {},
): LearnLesson {
  const { chapter, taskId, ...taskDefinition } = task
  return {
    id: `learn-${id}`,
    chapterId,
    title,
    learningObjective,
    stages: ['concept', ...(task.prediction ? ['prediction' as const] : []), 'task', 'feedback', ...(extras.transferTask ? ['transfer' as const] : [])],
    concept,
    task: {
      ...taskDefinition,
      id: taskId ?? `learn-${id}-task`,
      chapter: chapter ?? title,
      title,
      concept: concept.heading,
      learningObjective,
      workspacePresentation: task.workspacePresentation ?? {
        worlds: task.editable.includes('worlds'), valuations: task.editable.includes('valuations'),
        edges: task.editable.includes('edges'), evaluation: task.editable.includes('evaluation'),
      },
    },
    hints: lessonHints,
    successExplanation,
    ...extras,
  }
}

export function chapter(
  id: string,
  title: string,
  description: string,
  prerequisiteChapterIds: readonly string[],
  lessons: readonly LearnLesson[],
  completionSummary: readonly string[],
  nextPreview?: string,
): LearnChapter {
  return { id, title, description, prerequisiteChapterIds, lessons, completionSummary, nextPreview }
}
