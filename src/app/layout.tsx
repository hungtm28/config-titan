import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarInset,
  SidebarMenuSub,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import { AtomIcon } from '@/components/icons';
import Link from 'next/link';
import { Files, Settings, ClipboardIcon } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Ateme Titan Configurator V13',
  description: 'Mail của Huân ngày 17/08/2026',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased flex h-full" suppressHydrationWarning>
        <SidebarProvider defaultOpen={true}>
          <Sidebar>
            <SidebarHeader>
              <div className="flex items-center gap-2">
                <AtomIcon className="size-6 text-primary" />
                <h2 className="text-lg font-semibold">Titan Tools</h2>
              </div>
            </SidebarHeader>
            <SidebarContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <Link href="/configurator">
                    <SidebarMenuButton tooltip="Configurator">
                      <Settings />
                      Configurator
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <Link href="/compare">
                    <SidebarMenuButton tooltip="Compare JSON">
                      <Files />
                      Compare JSON
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <Link href="/audit">
                    <SidebarMenuButton tooltip="Audit Profile">
                      <ClipboardIcon />
                      Audit Profile
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
          </Sidebar>
          <SidebarInset className="flex-1 flex flex-col min-h-0 p-4 sm:p-6 md:p-8">
            {children}
          </SidebarInset>
        </SidebarProvider>
        <Toaster />
      </body>
    </html>
  );
}
