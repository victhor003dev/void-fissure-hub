import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
    /* config options here */
    output: "standalone",
    reactCompiler: true,
    allowedDevOrigins: ["localhost:3000", "192.168.4.235"],
    serverExternalPackages: ["lzma", "@wfcd/items"],
};

const withNextIntl = createNextIntlPlugin({
    experimental: {
        createMessagesDeclaration: "./messages/en.json",
    },
});
export default withNextIntl(nextConfig);
