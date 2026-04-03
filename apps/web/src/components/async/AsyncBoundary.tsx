import { Loader } from '../loader/Loader';
import { NotFound } from '../notFound/NotFound';

type Props = {
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  children: React.ReactNode;
};

export function AsyncBoundary({ isLoading, isError, errorMessage = 'Не найдено', children }: Props) {
  if (isLoading) return <Loader />;
  if (isError) return <NotFound errorMessage={errorMessage} />;
  return <>{children}</>;
}
