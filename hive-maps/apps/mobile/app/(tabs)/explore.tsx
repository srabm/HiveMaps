import { Href, Redirect } from 'expo-router';

export default function ExploreScreen() {
  return <Redirect href={'/account' as Href} />;
}
