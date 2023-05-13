export function provideActivate({ signIn }: { signIn: () => Promise<void> }): {
  activate: (command?: string) => Promise<void>
} {
  let activating = false

  return {
    async activate(command) {
      if (activating) return
      try {
        activating = true
        await signIn()
      } finally {
        activating = false
      }
    },
  }
}
