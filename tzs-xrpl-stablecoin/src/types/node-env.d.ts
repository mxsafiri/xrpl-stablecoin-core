// Type declarations for Node.js globals

declare const __dirname: string;
declare const __filename: string;
declare const require: NodeRequire;
declare const module: NodeModule;
declare const process: NodeJS.Process;

interface NodeModule {
  exports: any;
  require: NodeRequire;
  id: string;
  filename: string;
  loaded: boolean;
  parent: NodeModule | null;
  children: NodeModule[];
  paths: string[];
}

interface NodeRequire {
  (id: string): any;
  resolve: RequireResolve;
  cache: { [id: string]: NodeModule };
  extensions: { [ext: string]: (module: NodeModule, filename: string) => any };
  main: NodeModule | undefined;
}

interface RequireResolve {
  (id: string, options?: { paths?: string[]; }): string;
  paths(request: string): string[] | null;
}
