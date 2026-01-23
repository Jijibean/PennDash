import { SafeAreaProvider } from 'react-native-safe-area-context';
import PennDash from './PennDash';

export default function App() {
  return (
    <SafeAreaProvider>
      <PennDash />
    </SafeAreaProvider>
  );
}
