import type { BrsFile, FileObj, Program, XmlFile } from 'brighterscript';

import * as path from 'path';
import * as fs from 'fs';

export class FileFactory {

    constructor(options: any) {
        if (options.frameworkSourcePath) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            this.sourcePath = options.frameworkSourcePath;
        }
    }

    private frameworkFileNames = [
        'BaseTestSuite',
        'CommonUtils',
        'Coverage',
        'Matchers',
        'Rooibos',
        'RuntimeConfig',
        'Stats',
        'Test',
        'TestGroup',
        'BaseTestReporter',
        'ConsoleTestReporter',
        'TestResult',
        'TestRunner',
        'Utils'
    ];

    public sourcePath = path.join(__dirname, '../framework');
    private targetPath = 'source/rooibos/';
    private targetCompsPath = 'components/rooibos/';

    public getFrameworkFiles(): FileObj[] {
        let files: FileObj[] = [];

        for (let fileName of this.frameworkFileNames) {
            files.push({ src: path.resolve(path.join(this.sourcePath, `${fileName}.bs`)), dest: path.join(this.targetPath, `${fileName}.bs`) });
        }
        files.push({ src: path.resolve(path.join(this.sourcePath, `RooibosScene.xml`)), dest: path.join(this.targetCompsPath, `RooibosScene.xml`) });
        return files;
    }

    public addFrameworkFiles(program: Program) {
        for (let fileName of this.frameworkFileNames) {
            let sourcePath = path.resolve(path.join(this.sourcePath, `${fileName}.bs`));
            let fileContents = fs.readFileSync(sourcePath, 'utf8');
            let destPath = path.join(this.targetPath, `${fileName}.bs`);
            let entry = { src: sourcePath, dest: destPath };

            program.setFile(entry, fileContents);
        }

        let sourcePath = path.resolve(path.join(this.sourcePath, `RooibosScene.xml`));
        let destPath = path.join(this.targetCompsPath, `RooibosScene.xml`);
        let entry = { src: sourcePath, dest: destPath };
        program.setFile(entry, this.createTestXML('TestsScene', 'Scene'));
    }

    public createTestXML(name: string, baseName: string, useBs = true): string {
        let scriptImports = [];
        for (let fileName of this.frameworkFileNames) {
            scriptImports.push(`<script type="text/bright${useBs ? 'er' : ''}script" uri="pkg:/${this.targetPath}${fileName}.${useBs ? 'bs' : 'brs'}" />`);
        }

        let contents = `<?xml version="1.0" encoding="UTF-8" ?>
  <component
      name="${name}"
      extends="${baseName}">
${scriptImports.join('\n')}
    <interface>
      <field id="rooibosTestResult" type="assocarray"/>
      <field id="testText" type="string" alias="statusLabel.text" />
      <field id="failedText" type="string" alias="failedLabel.text" />
      <field id="statusColor" type="string" alias="statusBackground.color" />
      <function name='Rooibos_CreateTestNode' />
    </interface>

    <children>
      <Rectangle id="statusBackground" color="#444444" width="1920" height="1080" />
      <Label id="statusLabel" text='Rooibos is running tests' />
      <Label id="failedLabel" text="" translation="[0, 100]" width="1800" wrap="true" maxLines="15"/>
    </children>
  </component>
   `;
        return contents;
    }

    public isIgnoredFile(file: BrsFile | XmlFile): boolean {
        let name = file.pkgPath.toLowerCase();
        let result = this.frameworkFileNames.find((f) => {
            return name === path.join(this.targetPath, `${f}.bs`).toLowerCase();
        }
        );
        return result !== undefined;
    }

    public addFile(program, projectPath: string, contents: string) {
        try {
            return program.setFile({ src: path.resolve(projectPath), dest: projectPath }, contents);
        } catch (error) {
            console.error(`Error adding framework file: ${projectPath} : ${error.message}`);
        }
    }

}
