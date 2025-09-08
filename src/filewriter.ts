import fs from 'fs-extra';

export async function writeFile(filename: string, content: string): Promise<void> {
	await fs.outputFile(filename, content);
}
