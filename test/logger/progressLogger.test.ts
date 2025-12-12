import ProgressBar from "../../src/logger/progressLogger";
import cliProgress from "cli-progress";
import colors from "colors";

jest.mock("cli-progress", () => {
    const SingleBarMock = jest.fn();
    return {
        SingleBar: SingleBarMock,
        Presets: { shades_classic: "mockPreset" },
    };
});

jest.mock("colors", () => ({
    cyan: jest.fn((str: string) => `cyan(${str})`),
    green: jest.fn((str: string) => `green(${str})`),
}));

describe("ProgressBar", () => {
    const SingleBarMock = cliProgress.SingleBar as unknown as jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should create a SingleBar instance with correct options", () => {
        const bar = ProgressBar.createProgressBar();

        expect(SingleBarMock).toHaveBeenCalledWith(
            expect.objectContaining({
                format: "cyan({bar}) {percentage}% | green({message})",
                hideCursor: true,
            }),
            "mockPreset"
        );

        expect(bar).toBeInstanceOf(SingleBarMock);
    });
});
