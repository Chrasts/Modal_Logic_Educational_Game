import { describe, expect, it } from 'vitest'
import { learnCourse, learnCourseStats } from './learn'
import readme from '../README.md?raw'
import learnDocumentation from '../docs/LEARN_COURSE.md?raw'

describe('Learn documentation', () => {
  it('keeps the documented chapter order and totals aligned with course data', () => {
    const documentedCourse = learnDocumentation.replace(/\s+/gu, ' ')
    let previousIndex = -1
    for (const chapter of learnCourse.chapters) {
      const index = documentedCourse.indexOf(`**${chapter.title}**`, previousIndex + 1)
      expect(index, `${chapter.title} is documented`).toBeGreaterThan(previousIndex)
      previousIndex = index
    }
    expect(documentedCourse).toContain(`${learnCourseStats.chapterCount} chapters containing ${learnCourseStats.lessonCount} lessons`)
  })

  it('does not describe an available chapter as coming later', () => {
    const documentation = `${readme}\n${learnDocumentation}`
    expect(documentation).not.toMatch(/coming[- ]later/i)
  })
})
