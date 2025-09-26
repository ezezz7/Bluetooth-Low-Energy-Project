import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  PermissionsAndroid,
  Platform,
  Dimensions,
  TextInput,
  ActivityIndicator,
  NativeEventEmitter,
  NativeModules,
} from 'react-native';

import BleManager, { BleManagerDidUpdateValueForCharacteristicEvent } from 'react-native-ble-manager';
import { LineChart, BarChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;
const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

interface Peripheral {
  id: string;
  name?: string;
  rssi: number;
  advertising?: any;
}

interface ConnectedDevice {
  id: string;
  name?: string;
  services?: any[];
  characteristics?: any[];
}

interface BLEMessage {
  timestamp: string;
  data: string;
  type: 'sent' | 'received';
}

const App = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [peripherals, setPeripherals] = useState<Peripheral[]>([]);
  const [bleState, setBleState] = useState('unknown');
  const [connectedDevice, setConnectedDevice] = useState<ConnectedDevice | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [services, setServices] = useState<any[]>([]);
  const [characteristics, setCharacteristics] = useState<any[]>([]);
  const [messages, setMessages] = useState<BLEMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [receivedData, setReceivedData] = useState<number[]>([20, 45, 28, 80, 99, 43]);

  const chartData = {
    line: {
      labels: ['1s', '2s', '3s', '4s', '5s', '6s'],
      datasets: [{
        data: receivedData,
        strokeWidth: 2
      }]
    },
  };

  useEffect(() => {
    initBLE();
    return () => {
      // Cleanup listeners
      bleManagerEmitter.removeAllListeners('BleManagerDidUpdateValueForCharacteristic');
      bleManagerEmitter.removeAllListeners('BleManagerDiscoverPeripheral');
      bleManagerEmitter.removeAllListeners('BleManagerStopScan');
    };
  }, []);

  const initBLE = async () => {
    try {
      console.log('=== INITIALIZING BLE ===');
      await BleManager.start({ showAlert: false });
      console.log('✅ BLE Manager initialized');
      
      console.log('=== REQUESTING PERMISSIONS ===');
      await requestPermissions();
      
      console.log('=== CHECKING BLE STATE ===');
      const state = await BleManager.checkState();
      setBleState(state);
      console.log('✅ BLE State:', state);
      
      if (state !== 'on') {
        console.log('⚠️  Bluetooth is not enabled!');
        Alert.alert('Bluetooth Required', 'Please enable Bluetooth to use this app');
      }
      
      // Setup event listeners
      console.log('=== SETTING UP EVENT LISTENERS ===');
      bleManagerEmitter.addListener('BleManagerDiscoverPeripheral', handleDiscoverPeripheral);
      bleManagerEmitter.addListener('BleManagerStopScan', handleStopScan);
      bleManagerEmitter.addListener('BleManagerDidUpdateValueForCharacteristic', handleCharacteristicUpdate);
      console.log('✅ Event listeners configured');
      
    } catch (error: any) {
      console.error('❌ BLE initialization error:', error);
      Alert.alert('BLE Error', `Failed to initialize BLE: ${error?.message || 'Unknown error'}`);
    }
  };

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        console.log('🔐 Requesting Android permissions...');
        console.log('📱 Android API Level:', Platform.Version);
        
        const permissions = [
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ];

        // Android 12+ (API 31+) permissions
        if (Platform.Version >= 31) {
          console.log('📱 Android 12+ detected, adding BLE permissions...');
          permissions.push(
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN as any,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT as any,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE as any,
          );
        }

        console.log('🔐 Requesting permissions:', permissions);
        const granted = await PermissionsAndroid.requestMultiple(permissions as any);
        console.log('✅ Permissions result:', granted);
        
        // Check if all critical permissions were granted
        const locationGranted = granted['android.permission.ACCESS_FINE_LOCATION'] === 'granted' ||
                               granted['android.permission.ACCESS_COARSE_LOCATION'] === 'granted';
        
        if (!locationGranted) {
          console.log('❌ Location permission denied - BLE scan will not work');
          Alert.alert(
            'Location Permission Required', 
            'Location permission is required for BLE scanning on Android. Please grant it in settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => console.log('Open settings requested') }
            ]
          );
        } else {
          console.log('✅ Location permission granted');
        }
        
        // Check BLE permissions for Android 12+
        if (Platform.Version >= 31) {
          const bleGranted = granted['android.permission.BLUETOOTH_SCAN'] === 'granted' &&
                            granted['android.permission.BLUETOOTH_CONNECT'] === 'granted';
          
          if (!bleGranted) {
            console.log('❌ BLE permissions denied on Android 12+');
            Alert.alert(
              'Bluetooth Permissions Required',
              'Bluetooth permissions are required for BLE functionality on Android 12+.'
            );
          } else {
            console.log('✅ BLE permissions granted on Android 12+');
          }
        }
        
      } catch (error: any) {
        console.error('❌ Permission error:', error);
        Alert.alert('Permission Error', `Failed to request permissions: ${error?.message || 'Unknown error'}`);
      }
    } else {
      console.log('📱 iOS detected - no explicit permissions needed');
    }
  };

  const handleDiscoverPeripheral = (peripheral: any) => {
    console.log('Discovered peripheral:', peripheral);
    setPeripherals(prevPeripherals => {
      const existingIndex = prevPeripherals.findIndex(p => p.id === peripheral.id);
      if (existingIndex !== -1) {
        // Update existing peripheral
        const updated = [...prevPeripherals];
        updated[existingIndex] = peripheral;
        return updated;
      } else {
        // Add new peripheral
        return [...prevPeripherals, peripheral];
      }
    });
  };

  const handleStopScan = () => {
    console.log('Scan stopped');
    setIsScanning(false);
  };

const startScan = async () => {
  if (!isScanning) {
    try {
      setIsScanning(true);
      setPeripherals([]);
      
      console.log('=== STARTING ENHANCED BLE SCAN ===');
      console.log('📡 Clearing previous scan results...');
      
      // Try to get already discovered peripherals first
      console.log('🔍 Checking for already discovered peripherals...');
      const existingPeripherals = await BleManager.getDiscoveredPeripherals();
      console.log('📱 Found existing peripherals:', existingPeripherals?.length || 0);
      
      if (existingPeripherals && existingPeripherals.length > 0) {
        console.log('📋 Existing peripherals details:', existingPeripherals);
        setPeripherals(existingPeripherals);
      }
      
      // Try different scan approaches
      console.log('🚀 Starting scan approach 1: No service filter, allow duplicates...');
      try {
        await BleManager.scan([], 15, true); // 15 seconds, allow duplicates
        console.log('✅ Scan started successfully');
      } catch (scanError) {
        console.error('❌ Scan approach 1 failed:', scanError);
        
        // Try approach 2: Shorter scan without duplicates
        console.log('Trying scan approach 2: Shorter scan, no duplicates...');
        await BleManager.scan([], 5, false);
      }
      
      // Set up a timeout to check results periodically
      let checkCount = 0;
      const maxChecks = 15; // Check for 15 seconds
      
      const scanCheckInterval = setInterval(async () => {
        checkCount++;
        console.log(`🔍 Scan check ${checkCount}/${maxChecks}...`);
        
        try {
          const discoveredDevices = await BleManager.getDiscoveredPeripherals();
          console.log(`📱 Currently discovered: ${discoveredDevices?.length || 0} devices`);
          
          if (discoveredDevices && discoveredDevices.length > 0) {
            console.log('🎉 Found devices:', discoveredDevices.map(d => ({
              name: d.name || 'Unknown',
              id: d.id?.substring(0, 8) + '...',
              rssi: d.rssi
            })));
            setPeripherals(discoveredDevices);
          }
        } catch (error) {
          console.error('❌ Error checking discovered peripherals:', error);
        }
        
        if (checkCount >= maxChecks) {
          console.log('⏹️ Scan timeout reached, stopping...');
          clearInterval(scanCheckInterval);
          setIsScanning(false);
          
          if (peripherals.length === 0) {
            console.log('❌ No devices found after full scan');
            // Alert.alert(
            //   'No Devices Found',
            //   'BLE scan completed but no devices were discovered.\n\n' +
            //   'Troubleshooting:\n' +
            //   '• Ensure target device is advertising\n' +
            //   '• Check if device is in pairing mode\n' +
            //   '• Try moving closer to target device\n' +
            //   '• Restart Bluetooth on both devices',
            //   [
            //     { text: 'OK' },
            //     { 
            //       text: 'Try Again', 
            //       onPress: () => {
            //         setTimeout(() => startScan(), 1000);
            //       }
            //     }
            //   ]
            // );
          } else {
            console.log(`✅ Scan completed. Found ${peripherals.length} device(s)`);
          }
        }
      }, 1000); // Check every second
      
    } catch (error) {
      console.error('❌ Scan initialization error:', error);
      setIsScanning(false);
      Alert.alert('Scan Error', `Failed to start scan: ${String(error)}`);
    }
  } else {
    console.log('⚠️ Scan already in progress, ignoring request');
  }
};

// Manual Debug
const debugBLE = async () => {
  console.log('=== BLE DEBUG INFO ===');
  
  try {
    const state = await BleManager.checkState();
    console.log('🔵 Bluetooth State:', state);
    
    const discoveredDevices = await BleManager.getDiscoveredPeripherals();
    console.log('📱 Discovered Peripherals:', discoveredDevices?.length || 0);
    
    const connectedDevices = await BleManager.getConnectedPeripherals([]);
    console.log('🔗 Connected Peripherals:', connectedDevices?.length || 0);
    
    // Check if location services are enabled (Android requirement)
    console.log('📍 Location services should be enabled for BLE scanning on Android');
    
    Alert.alert(
      'BLE Debug Info',
      `Bluetooth: ${state}\n` +
      `Discovered: ${discoveredDevices?.length || 0} devices\n` +
      `Connected: ${connectedDevices?.length || 0} devices\n\n` +
      'Check logs for detailed information'
    );
    
  } catch (error) {
    console.error('❌ Debug error:', error);
    Alert.alert('Debug Error', String(error));
  }
};

  const stopScan = async () => {
    try {
      await BleManager.stopScan();
      setIsScanning(false);
      console.log('Scan stopped manually');
    } catch (error: any) {
      console.error('Stop scan error:', error);
    }
  };

  const connectToDevice = async (peripheral: Peripheral) => {
    if (isConnecting) return;
    
    try {
      setIsConnecting(true);
      
      Alert.alert('Connecting', `Attempting to connect to ${peripheral.name || 'Unknown Device'}...`);
      
      // Connect to the device
      await BleManager.connect(peripheral.id);
      console.log('Connected to device:', peripheral.id);
      
      // Retrieve services and characteristics
      const deviceInfo = await BleManager.retrieveServices(peripheral.id);
      console.log('Device info:', deviceInfo);
      
      const deviceServices = deviceInfo.services || [];
      const deviceCharacteristics = deviceInfo.characteristics || [];
      
      setConnectedDevice({
        id: peripheral.id,
        name: peripheral.name,
        services: deviceServices,
        characteristics: deviceCharacteristics
      });
      
      setServices(deviceServices);
      setCharacteristics(deviceCharacteristics);
      
      // Setup notifications for readable characteristics
      setupNotifications(peripheral.id, deviceCharacteristics);
      
      Alert.alert('Connected!', 
        `Connected to ${peripheral.name || 'Device'}\n` +
        `Services: ${deviceServices.length}\n` +
        `Characteristics: ${deviceCharacteristics.length}`
      );
      
    } catch (error: any) {
      console.error('Connection error:', error);
      Alert.alert('Connection Failed', `Could not connect to ${peripheral.name || 'device'}: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const setupNotifications = async (deviceId: string, deviceCharacteristics: any[]) => {
    for (const char of deviceCharacteristics) {
      try {
        // Look for characteristics that support notifications or indications
        if (char.properties && (char.properties.Notify || char.properties.Indicate)) {
        await BleManager.startNotification(deviceId, char.service, char.characteristic);
          console.log('Notification started for:', char.characteristic);
        }
      } catch (error: any) {
        console.log('Could not start notification for characteristic:', char.characteristic, error);
      }
    }
  };

  const handleCharacteristicUpdate = (data: BleManagerDidUpdateValueForCharacteristicEvent) => {
    console.log('Received data:', data);
    
    // Convert received data to string
    const receivedString = String.fromCharCode.apply(null, data.value as any);
    
    const newMessage: BLEMessage = {
      timestamp: new Date().toLocaleTimeString(),
      data: receivedString,
      type: 'received'
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    // Update chart data with received numeric values
    const numericValue = parseFloat(receivedString);
    if (!isNaN(numericValue)) {
      setReceivedData(prev => {
        const newData = [...prev.slice(1), numericValue];
        return newData;
      });
    }
  };

  const sendMessage = async () => {
    if (!connectedDevice || !inputMessage.trim()) return;
    
    try {
      // Find a writable characteristic
      const writableChar = characteristics.find(char => 
      char.properties && (char.properties.Write || char.properties.WriteWithoutResponse)
      );
      
      if (!writableChar) {
        Alert.alert('Error', 'No writable characteristic found');
        return;
      }
      
      // Convert string to byte array
      const data = inputMessage.split('').map(char => char.charCodeAt(0));
      
      await BleManager.write(
        connectedDevice.id,
        writableChar.service,
        writableChar.characteristic,
        data
      );
      
      const newMessage: BLEMessage = {
        timestamp: new Date().toLocaleTimeString(),
        data: inputMessage,
        type: 'sent'
      };
      
      setMessages(prev => [...prev, newMessage]);
      setInputMessage('');
      
      console.log('Message sent:', inputMessage);
      
    } catch (error: any) {
      console.error('Send error:', error);
      Alert.alert('Send Failed', `Could not send message: ${error?.message || 'Unknown error'}`);
    }
  };

  const disconnectDevice = async () => {
    if (!connectedDevice) return;
    
    try {
      await BleManager.disconnect(connectedDevice.id);
      setConnectedDevice(null);
      setServices([]);
      setCharacteristics([]);
      setMessages([]);
      
      Alert.alert('Disconnected', 'Device disconnected successfully');
      
    } catch (error: any) {
      console.error('Disconnect error:', error);
      Alert.alert('Disconnect Failed', `Could not disconnect: ${error?.message || 'Unknown error'}`);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>BLE Demo & Charts</Text>
        <Text style={styles.status}>
          Bluetooth: {bleState} | {connectedDevice ? `Connected to ${connectedDevice.name}` : 'Not connected'}
        </Text>
      </View>

      {/* BLE Connection Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bluetooth Low Energy - Real Device Test</Text>
        
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, isScanning && styles.buttonDisabled]}
            onPress={startScan}
            disabled={isScanning}
          >
            <Text style={styles.buttonText}>
              {isScanning ? 'Scanning...' : 'Start Scan'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={stopScan}
          >
            <Text style={styles.buttonText}>Stop Scan</Text>
          </TouchableOpacity>
          
          {connectedDevice && (
            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#f44336' }]}
              onPress={disconnectDevice}
            >
              <Text style={styles.buttonText}>Disconnect</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.subtitle}>Devices Found: {peripherals.length}</Text>
        {peripherals.map((device, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.deviceItem,
              connectedDevice?.id === device.id && styles.connectedDevice,
              isConnecting && styles.deviceItemDisabled
            ]}
            onPress={() => connectToDevice(device)}
            disabled={isConnecting}
          >
            <View style={styles.deviceHeader}>
              <Text style={styles.deviceName}>
                {device.name || 'Unknown Device'}
              </Text>
              {isConnecting && <ActivityIndicator size="small" />}
              {connectedDevice?.id === device.id && <Text style={styles.connectedText}>CONNECTED</Text>}
            </View>
            <Text style={styles.deviceInfo}>
              ID: {device.id.substring(0, 8)}... | RSSI: {device.rssi}dBm
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Communication Section */}
      {connectedDevice && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2-Way Communication</Text>
          
          <Text style={styles.subtitle}>Services: {services.length}</Text>
          <Text style={styles.subtitle}>Characteristics: {characteristics.length}</Text>
          
          <View style={styles.messageInput}>
            <TextInput
              style={styles.textInput}
              placeholder="Enter message to send..."
              value={inputMessage}
              onChangeText={setInputMessage}
            />
            <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
              <Text style={styles.buttonText}>Send</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.subtitle}>Messages ({messages.length}):</Text>
          <ScrollView style={styles.messageContainer}>
            {messages.map((msg, index) => (
              <View key={index} style={[
                styles.messageItem,
                msg.type === 'sent' ? styles.sentMessage : styles.receivedMessage
              ]}>
                <Text style={styles.messageTime}>{msg.timestamp}</Text>
                <Text style={styles.messageText}>{msg.type.toUpperCase()}: {msg.data}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Charts Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Real-time Data Charts</Text>
        
        <Text style={styles.subtitle}>Live BLE Data Chart:</Text>
        <LineChart
          data={chartData.line}
          width={screenWidth - 40}
          height={220}
          chartConfig={{
            backgroundColor: '#e26a00',
            backgroundGradientFrom: '#fb8c00',
            backgroundGradientTo: '#ffa726',
            decimalPlaces: 1,
            color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            style: { borderRadius: 16 },
            propsForDots: {
              r: '6',
              strokeWidth: '2',
              stroke: '#ffa726'
            }
          }}
          bezier
          style={styles.chart}
        />

        <Text style={styles.subtitle}>Device Activity Heat Map:</Text>
        <BarChart
          data={{
            labels: ['Dev1', 'Dev2', 'Dev3', 'Dev4', 'Dev5'],
            datasets: [{
              data: [85, 62, 93, 47, 78]
            }]
          }}
          width={screenWidth - 40}
          height={220}
          yAxisLabel=""
          yAxisSuffix=""
          chartConfig={{
            backgroundColor: '#1cc910',
            backgroundGradientFrom: '#eff3ff',
            backgroundGradientTo: '#efefef',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          }}
          style={styles.chart}
        />
      </View>

      {/* Status Section */}
      <View style={styles.section}>
        <Text style={styles.subtitle}>System Status:</Text>
        <Text>✅ BLE Manager: Initialized</Text>
        <Text>✅ Charts: Working with live data</Text>
        <Text>✅ Permissions: {Platform.OS === 'android' ? 'Requested' : 'N/A'}</Text>
        <Text>✅ Real BLE Communication: {connectedDevice ? 'Active' : 'Ready'}</Text>
        <Text>📱 Connected Device: {connectedDevice?.name || 'None'}</Text>
        <Text>📊 Messages Exchanged: {messages.length}</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#2196F3',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  status: {
    fontSize: 14,
    color: 'white',
    textAlign: 'center',
    marginTop: 5,
  },
  section: {
    margin: 20,
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 10,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 10,
    color: '#555',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
    flexWrap: 'wrap',
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 5,
    minWidth: 80,
    margin: 2,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 12,
  },
  deviceItem: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    marginBottom: 8,
    backgroundColor: '#fafafa',
  },
  deviceItemDisabled: {
    opacity: 0.5,
  },
  connectedDevice: {
    borderColor: '#4CAF50',
    backgroundColor: '#e8f5e8',
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
  },
  connectedText: {
    color: '#4CAF50',
    fontWeight: 'bold',
    fontSize: 12,
  },
  deviceInfo: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  messageInput: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 5,
  },
  messageContainer: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 5,
  },
  messageItem: {
    padding: 8,
    marginBottom: 5,
    borderRadius: 5,
  },
  sentMessage: {
    backgroundColor: '#e3f2fd',
    alignSelf: 'flex-end',
  },
  receivedMessage: {
    backgroundColor: '#f3e5f5',
    alignSelf: 'flex-start',
  },
  messageTime: {
    fontSize: 10,
    color: '#666',
  },
  messageText: {
    fontSize: 12,
    marginTop: 2,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
});

export default App;