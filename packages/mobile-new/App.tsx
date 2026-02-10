import { View, Text, StyleSheet } from 'react-native';

export default function App() {
  console.log("MANUAL APP MOUNTED");
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Manual Application Load</Text>
      <View style={styles.box} />
      <Text style={styles.subtext}>If you see this, native part is OK.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffeb3b', // Yellow background to be very obvious
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'black',
  },
  subtext: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  box: {
    width: 100,
    height: 100,
    backgroundColor: 'red',
    marginVertical: 20,
  },
});
