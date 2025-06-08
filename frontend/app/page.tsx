import { redirect } from 'next/navigation';

export default function RootPage() {
  // Redirect to Japanese version by default
  redirect('/ja');
}