import BaseProject from './base-project.js';
import * as fs from 'fs';
import { join } from 'path';

export default class AWSProject extends BaseProject {    
    async createVpc(): Promise<void> {
    }    
}