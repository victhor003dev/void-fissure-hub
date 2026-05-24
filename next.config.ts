import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
    /* config options here */
    reactCompiler: true,
    allowedDevOrigins: ["localhost:3000", "192.168.4.235"],
};

const withNextIntl = createNextIntlPlugin({
    experimental: {
        createMessagesDeclaration: "./messages/en.json",
    },
});
export default withNextIntl(nextConfig);
