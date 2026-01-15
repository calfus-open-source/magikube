import fs from 'fs';
import os from 'os';
import path from 'path';
import AWSProfile from '../../src/core/aws/aws-profile.js';
import { AppLogger } from '../../src/logger/appLogger.js';

jest.mock('fs');
jest.mock('os');
jest.mock('../../src/logger/appLogger.js', () => ({
    AppLogger: {
        debug: jest.fn(),
    },
}));

describe('AWSProfile Utils', () => {
    const mockHome = '/user/home';

    beforeEach(() => {
        jest.clearAllMocks();
        (os.homedir as jest.Mock).mockReturnValue(mockHome);
    });

    describe('getProfiles()', () => {
        it('should return an empty array if credentials file does not exist', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const profiles = AWSProfile.getProfiles();
            expect(profiles).toEqual([]);
            expect(AppLogger.debug).toHaveBeenCalled();
        });

        it('should parse AWS profiles from credentials file', () => {
            const fakeCredentials = `
[default]
aws_access_key_id = KEY123
aws_secret_access_key = SECRET123

[dev]
aws_access_key_id = DEVKEY
aws_secret_access_key = DEVSECRET
`;

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(fakeCredentials);

            const profiles = AWSProfile.getProfiles();

            expect(profiles).toEqual([
                {
                    profileName: 'default',
                    awsAccessKey: 'KEY123',
                    awsSecretAccessKey: 'SECRET123'
                },
                {
                    profileName: 'dev',
                    awsAccessKey: 'DEVKEY',
                    awsSecretAccessKey: 'DEVSECRET'
                }
            ]);

            expect(AppLogger.debug).toHaveBeenCalled();
        });
    });

    describe('addProfile()', () => {
        const mockAwsDir = path.join(mockHome, '.aws');
        const mockCredentialsFile = path.join(mockAwsDir, 'credentials');

        it('should create .aws directory and credentials file if missing', () => {
            (fs.existsSync as jest.Mock)
                .mockReturnValueOnce(false) 
                .mockReturnValueOnce(false);

            (fs.readFileSync as jest.Mock).mockReturnValue('');

            AWSProfile.addProfile('test', 'KEY', 'SECRET');

            expect(fs.mkdirSync).toHaveBeenCalledWith(mockAwsDir);
            expect(fs.writeFileSync).toHaveBeenCalledWith(mockCredentialsFile, '');
            expect(fs.writeFileSync).toHaveBeenCalledTimes(2); 
        });

        it('should append a new profile to an existing credentials file', () => {
            (fs.existsSync as jest.Mock)
                .mockReturnValueOnce(true)
                .mockReturnValueOnce(true);

            (fs.readFileSync as jest.Mock).mockReturnValue('[default]\naws_access_key_id = X\naws_secret_access_key = Y');

            AWSProfile.addProfile('newProfile', 'NEWKEY', 'NEWSECRET');

            expect(fs.writeFileSync).toHaveBeenCalledWith(
                mockCredentialsFile,
                '[default]\naws_access_key_id = X\naws_secret_access_key = Y\n\n[newProfile]\naws_access_key_id = NEWKEY\naws_secret_access_key = NEWSECRET'
            );

            expect(AppLogger.debug).toHaveBeenCalled();
        });
    });
});
