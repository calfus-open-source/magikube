import {expect, test} from '@oclif/test'

describe('ssh-key', () => {
  test
  .stdout()
  .command(['ssh-key'])
  .it('runs hello', ctx => {
    expect(ctx.stdout).to.contain('hello world')
  })

  test
  .stdout()
  .command(['ssh-key', '--name', 'jeff'])
  .it('runs hello --name jeff', ctx => {
    expect(ctx.stdout).to.contain('hello jeff')
  })
})
