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

            program.addOrReplaceFile(entry, fileContents);
        }

        let sourcePath = path.resolve(path.join(this.sourcePath, `RooibosScene.xml`));
        let destPath = path.join(this.targetCompsPath, `RooibosScene.xml`);
        let entry = { src: sourcePath, dest: destPath };
        program.addOrReplaceFile(entry, this.createTestXML('TestsScene', 'Scene'));
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
    </interface>
    <children>
      <LayoutGroup>
        <Label text="Rooibos tests are running" />
      </LayoutGroup>
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
        program.addOrReplaceFile({ src: path.resolve(projectPath), dest: projectPath }, contents);
    }

}