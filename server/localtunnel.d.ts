declare module 'localtunnel' {
  interface TunnelOptions {
    port: number;
    subdomain?: string;
    host?: string;
    local_host?: string;
  }
  interface Tunnel {
    url: string;
    close(): void;
    on(event: string, callback: (...args: any[]) => void): this;
  }
  export default function localtunnel(options: TunnelOptions): Promise<Tunnel>;
}
