import { useState } from 'react'
import { useAnalyticsView } from '../analytics'
import type { GameLevel } from '../campaign'
import type { ConceptQuestion, LearnCourse, LearnLesson } from '../learn'
import type { LearnProgress } from '../learn-progress'

function ChapterRecapQuestions({ questions }: { readonly questions: readonly ConceptQuestion[] }) {
  const [answers, setAnswers] = useState<Readonly<Record<number, string>>>({})
  return <div className="concept-recap" aria-label="Concept recap questions"><strong>Concept check</strong>{questions.map((question, index) => {
    const answer = answers[index]
    const correct = answer === question.correctChoice
    return <fieldset key={question.prompt}><legend>{index + 1}. {question.prompt}</legend><div>{question.choices.map((choice) => <button type="button" className={answer === choice ? 'selected' : ''} aria-pressed={answer === choice} key={choice} onClick={() => setAnswers((current) => ({ ...current, [index]: choice }))}>{choice}</button>)}</div>{answer && <p role="status" className={correct ? 'correct' : 'incorrect'}><b>{correct ? 'Correct.' : 'Not quite.'}</b> {question.explanation}</p>}</fieldset>
  })}</div>
}

interface LearnOverviewProps {
  readonly completed: number
  readonly total: number
  readonly progress: LearnProgress
  readonly tutorialLevels: readonly GameLevel[]
  readonly tutorialCompleted: number
  readonly nextTutorialIndex: number
  readonly expandedChapterId: string | null
  readonly completedLevelIds: ReadonlySet<string>
  readonly course: LearnCourse
  readonly lessons: readonly LearnLesson[]
  readonly onContinue: () => void
  readonly onWelcome: () => void
  readonly onOpenControl: (index: number) => void
  readonly onRestartControls: () => void
  readonly onOpenLesson: (index: number) => void
  readonly onRestartChapter: (chapterId: string) => void
  readonly onToggleChapter: (chapterId: string) => void
}

export function LearnOverview({ completed, total, progress, tutorialLevels, tutorialCompleted, nextTutorialIndex, expandedChapterId, completedLevelIds, course, lessons, onContinue, onWelcome, onOpenControl, onRestartControls, onOpenLesson, onRestartChapter, onToggleChapter }: LearnOverviewProps) {
  useAnalyticsView('learn')
  return <section className="content-screen learn-course-screen" aria-labelledby="learn-course-title">
    <div className="screen-hero compact"><div><p className="eyebrow">Your recommended learning path</p><h1 id="learn-course-title">Learn Modal Logic</h1><p>Welcome, learn the controls, then work through finite Kripke semantics one section at a time.</p>{completed < total && <button type="button" className="primary-action" onClick={onContinue}>{completed === 0 ? 'Start Learning' : 'Continue Learning'}</button>}</div><div className="collection-progress" role="status"><strong>{completed}/{total}</strong><span>{completed === total ? 'course complete' : 'available tasks complete'}</span><div className="progress-meter"><i style={{ width: `${completed / total * 100}%` }} /></div></div></div>
    <div className="learn-chapter-list">
      <article><div><p className="eyebrow">{progress.welcomeViewed ? 'Viewed' : 'Not viewed'}</p><h2>Welcome to Modal Logic</h2><p>Possible worlds, accessibility, possibility, necessity, and how guided tasks work.</p></div><button type="button" className={progress.welcomeViewed ? 'secondary-button' : 'primary-action'} onClick={onWelcome}>{progress.welcomeViewed ? 'Replay introduction' : 'Open introduction'}</button></article>
      <article className={`${tutorialCompleted === tutorialLevels.length ? 'complete ' : ''}${expandedChapterId === 'controls' ? 'expanded' : ''}`}>
        <div><p className="eyebrow">{tutorialCompleted === tutorialLevels.length ? 'Completed' : 'Available'}</p><h2>Learn the Controls</h2><p>Use the shared model editor before beginning semantic lessons.</p><small>{tutorialCompleted}/{tutorialLevels.length} lessons</small>{expandedChapterId === 'controls' && <div className="chapter-lesson-outline"><ol>{tutorialLevels.map((level, index) => {
          const lessonComplete = completedLevelIds.has(level.id)
          const lessonCurrent = !lessonComplete && index === nextTutorialIndex
          return <li className={lessonComplete ? 'complete' : lessonCurrent ? 'current' : ''} key={level.id}><span><b>{level.title}</b><small>{lessonComplete ? 'Completed' : lessonCurrent ? 'Current' : 'Unfinished'}</small></span><button type="button" className={lessonComplete ? 'secondary-button' : 'text-button'} onClick={() => onOpenControl(index)}>{lessonComplete ? 'Replay' : 'Open'}</button></li>
        })}</ol></div>}</div>
        <div className="chapter-actions"><button type="button" className={tutorialCompleted === tutorialLevels.length ? 'secondary-button' : 'primary-action'} onClick={() => onOpenControl(nextTutorialIndex < 0 ? 0 : nextTutorialIndex)}>{tutorialCompleted === tutorialLevels.length ? 'Replay section' : tutorialCompleted > 0 ? 'Continue' : 'Start'}</button><button type="button" className="text-button" aria-expanded={expandedChapterId === 'controls'} onClick={() => onToggleChapter('controls')}>{expandedChapterId === 'controls' ? 'Hide lessons' : 'View lessons'}</button>{tutorialCompleted > 0 && tutorialCompleted < tutorialLevels.length && <button type="button" className="text-button" onClick={onRestartControls}>Restart section</button>}</div>
      </article>
      {course.chapters.map((chapter) => {
        const chapterCompleted = chapter.lessons.filter((lesson) => progress.completedLessonIds.includes(lesson.id)).length
        const chapterComplete = chapterCompleted === chapter.lessons.length && chapter.lessons.length > 0
        const available = chapter.lessons.length > 0
        const currentIndex = lessons.findIndex((lesson) => lesson.chapterId === chapter.id && !progress.completedLessonIds.includes(lesson.id))
        const expanded = expandedChapterId === chapter.id
        return <article className={`${chapterComplete ? 'complete ' : ''}${expanded ? 'expanded' : ''}`} key={chapter.id}>
          <div><p className="eyebrow">{chapter.lessons.length === 0 ? 'Coming later' : chapterComplete ? 'Completed' : 'Available'}</p><h2>{chapter.title}</h2><p>{chapter.description}</p>{chapter.prerequisiteChapterIds.length > 0 && <p className="chapter-prerequisites">Recommended after: {chapter.prerequisiteChapterIds.map((id) => course.chapters.find((candidate) => candidate.id === id)?.title ?? id).join(', ')}</p>}{available && <small>{chapterCompleted}/{chapter.lessons.length} lessons</small>}{expanded && <div className="chapter-lesson-outline"><ol>{chapter.lessons.map((lesson) => {
            const lessonComplete = progress.completedLessonIds.includes(lesson.id)
            const lessonCurrent = progress.currentLessonId === lesson.id || (!chapterComplete && lessons[currentIndex]?.id === lesson.id)
            return <li className={lessonComplete ? 'complete' : lessonCurrent ? 'current' : ''} key={lesson.id}><span><b>{lesson.title}</b><small>{lessonComplete ? 'Completed' : lessonCurrent ? 'Current' : 'Unfinished'}</small></span><button type="button" className={lessonComplete ? 'secondary-button' : 'text-button'} onClick={() => onOpenLesson(lessons.findIndex(({ id }) => id === lesson.id))}>{lessonComplete ? 'Replay' : 'Open'}</button></li>
          })}</ol>{chapterComplete && <div className="chapter-recap"><strong>Section recap</strong><ul>{chapter.completionSummary.map((item) => <li key={item}>{item}</li>)}</ul>{chapter.recapQuestions && <ChapterRecapQuestions questions={chapter.recapQuestions} />}{chapter.nextPreview && <p>{chapter.nextPreview}</p>}</div>}</div>}</div>
          {available ? <div className="chapter-actions"><button type="button" className={chapterComplete ? 'secondary-button' : 'primary-action'} onClick={() => onOpenLesson(currentIndex < 0 ? lessons.findIndex((lesson) => lesson.chapterId === chapter.id) : currentIndex)}>{chapterComplete ? 'Replay section' : chapterCompleted > 0 ? 'Continue' : 'Start'}</button><button type="button" className="text-button" aria-expanded={expanded} onClick={() => onToggleChapter(chapter.id)}>{expanded ? 'Hide lessons' : 'View lessons'}</button>{!chapterComplete && chapterCompleted > 0 && <button type="button" className="text-button" onClick={() => onRestartChapter(chapter.id)}>Restart section</button>}</div> : <span className="chapter-coming">Coming later</span>}
        </article>
      })}
    </div>
  </section>
}
