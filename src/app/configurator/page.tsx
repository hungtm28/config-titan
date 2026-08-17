import { ConfiguratorForm } from '@/components/configurator-form';
import { AtomIcon } from '@/components/icons';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

export default function ConfiguratorPage() {
  return (
    <div className="flex w-full flex-col items-center justify-center">
      <main className="w-full max-w-2xl">
        <Card className="w-full shadow-2xl">
          <CardHeader>
            <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-primary shadow-md">
                <AtomIcon className="h-8 w-8 text-primary-foreground" />
              </div>
              <div className="flex-grow">
                <CardTitle className="text-3xl font-headline">
                  Ateme Titan Configurator V13
                </CardTitle>
                <CardDescription className="mt-1">
                  Mail của Huân ngày 17/08/2026.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ConfiguratorForm />
          </CardContent>
        </Card>
      </main>
      <footer className="mt-8 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Ateme Titan Configurator. All rights reserved.</p>
      </footer>
    </div>
  );
}
