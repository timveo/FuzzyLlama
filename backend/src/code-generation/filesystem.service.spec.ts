import { Test, TestingModule } from '@nestjs/testing';
import { FileSystemService } from './filesystem.service';
import * as fs from 'fs-extra';
import * as path from 'path';

describe('FileSystemService', () => {
  let service: FileSystemService;
  const testProjectId = 'test-project-123';
  let testWorkspacePath: string;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FileSystemService],
    }).compile();

    service = module.get<FileSystemService>(FileSystemService);
    testWorkspacePath = service.getProjectPath(testProjectId);
  });

  afterEach(async () => {
    // Clean up test workspace
    await fs.remove(testWorkspacePath);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createProjectWorkspace', () => {
    it('should create workspace directory', async () => {
      await service.createProjectWorkspace(testProjectId);

      const exists = await fs.pathExists(testWorkspacePath);
      expect(exists).toBe(true);
    });

    it('should not overwrite existing workspace', async () => {
      await service.createProjectWorkspace(testProjectId);

      // Try to initialize again
      await service.createProjectWorkspace(testProjectId);

      // Should not throw error
      const exists = await fs.pathExists(testWorkspacePath);
      expect(exists).toBe(true);
    });
  });

  describe('initializeProjectStructure', () => {
    beforeEach(async () => {
      await service.createProjectWorkspace(testProjectId);
    });

    it('should create package.json for React project', async () => {
      await service.initializeProjectStructure(testProjectId, 'react-vite');

      const packageJsonPath = path.join(testWorkspacePath, 'package.json');
      const exists = await fs.pathExists(packageJsonPath);
      expect(exists).toBe(true);

      const packageJson = await fs.readJson(packageJsonPath);
      expect(packageJson.name).toBeTruthy();
      expect(packageJson.dependencies).toBeDefined();
    });
  });

  describe('writeFile', () => {
    beforeEach(async () => {
      await service.createProjectWorkspace(testProjectId);
    });

    it('should write file to workspace', async () => {
      const filePath = 'src/index.ts';
      const content = 'console.log("Hello World");';

      await service.writeFile(testProjectId, filePath, content);

      const fullPath = path.join(testWorkspacePath, filePath);
      const exists = await fs.pathExists(fullPath);
      expect(exists).toBe(true);

      const fileContent = await fs.readFile(fullPath, 'utf-8');
      expect(fileContent).toBe(content);
    });

    it('should create nested directories', async () => {
      const filePath = 'src/components/ui/Button.tsx';
      const content = 'export const Button = () => <button />;';

      await service.writeFile(testProjectId, filePath, content);

      const fullPath = path.join(testWorkspacePath, filePath);
      const exists = await fs.pathExists(fullPath);
      expect(exists).toBe(true);
    });

    it('should prevent path traversal', async () => {
      const filePath = '../../../etc/passwd';
      const content = 'malicious';

      await expect(
        service.writeFile(testProjectId, filePath, content),
      ).rejects.toThrow('path traversal detected');
    });
  });

  describe('readFile', () => {
    beforeEach(async () => {
      await service.createProjectWorkspace(testProjectId);
    });

    it('should read file from workspace', async () => {
      const filePath = 'src/test.ts';
      const content = 'export const test = true;';

      await service.writeFile(testProjectId, filePath, content);

      const readContent = await service.readFile(testProjectId, filePath);
      expect(readContent).toBe(content);
    });

    it('should throw error for non-existent file', async () => {
      await expect(
        service.readFile(testProjectId, 'nonexistent.ts'),
      ).rejects.toThrow();
    });
  });

  describe('getDirectoryTree', () => {
    beforeEach(async () => {
      await service.createProjectWorkspace(testProjectId);
      await service.writeFile(testProjectId, 'src/index.ts', 'test');
      await service.writeFile(testProjectId, 'src/app.ts', 'test');
      await service.writeFile(testProjectId, 'src/utils/helper.ts', 'test');
    });

    it('should get directory tree', async () => {
      const tree = await service.getDirectoryTree(testProjectId, 'src');

      expect(tree).toBeDefined();
      // Directory tree returns nested structure with name and children
      expect(tree.name).toBe('src');
    });
  });

  describe('executeCommand', () => {
    beforeEach(async () => {
      await service.createProjectWorkspace(testProjectId);
    });

    it('should execute command in workspace', async () => {
      const result = await service.executeCommand(testProjectId, 'echo "test"');

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('test');
    });

    it('should handle command errors', async () => {
      const result = await service.executeCommand(
        testProjectId,
        'nonexistent-command',
      );

      expect(result.success).toBe(false);
      expect(result.stderr).toBeDefined();
    });

    it('should respect timeout', async () => {
      const result = await service.executeCommand(
        testProjectId,
        'sleep 10',
        { timeout: 1000 },
      );

      expect(result.success).toBe(false);
      expect(result.stderr).toContain('timeout');
    }, 10000);

    it('should execute in correct directory', async () => {
      const result = await service.executeCommand(testProjectId, 'pwd');

      expect(result.stdout).toContain(testProjectId);
    });
  });
});
