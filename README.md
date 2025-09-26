React Native BLE & Charting Demo
This project is a technical assessment designed to showcase key mobile development capabilities using React Native. The application demonstrates two core features: real-time, two-way data communication with a hardware device using Bluetooth Low Energy (BLE), and data visualization through a heat map chart.

✨ Key Features
This application successfully implements the two main requirements of the assessment:

Bluetooth Low Energy (BLE) Communication:

Built with the react-native-ble-manager library.

Performs scanning for nearby BLE peripherals.

Establishes a connection to a real BLE device based on its UUID.

Discovers the device's services and characteristics.

Demonstrates two-way communication by sending string data to the peripheral and receiving string data back.

Data Visualization:

Includes a screen displaying a heat map chart.

The chart is populated with placeholder data to demonstrate data visualization capabilities.

🛠️ Technologies Used
Framework: React Native (CLI)

Bluetooth: react-native-ble-manager

Permissions: react-native-permissions

Language: TypeScript

Android Build: Gradle

🚀 Getting Started
To run this project locally, follow these steps:

1. Clone the repository:

'git clone [https://github.com/your-username/your-repository-name.git](https://github.com/your-username/your-repository-name.git)'
'cd BleDemoProject'

2. Install dependencies:

'yarn install'

3. Set up the Android environment:
Ensure you have the Android SDK, JDK 17, and a physical Android device with USB Debugging enabled.

4. Run the application:
Connect your device and run the following command:

'yarn react-native run-android'
