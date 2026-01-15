import cliProgress from 'cli-progress';
import colors from 'colors';

export class ProgressBar {
  public static createProgressBar() {
    return new cliProgress.SingleBar(
      {
        format:
          colors.cyan('{bar}') +
          ' {percentage}% | ' +
          colors.green('{message}'),
        hideCursor: true,
      },
      cliProgress.Presets.shades_classic,
    );
  }
}
