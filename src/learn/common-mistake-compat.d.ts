import '../learn'

declare module '../learn' {
  interface LearnLesson {
    /** Legacy authored metadata kept only for compatibility; it is not rendered to learners. */
    readonly commonMistake?: string
  }
}
