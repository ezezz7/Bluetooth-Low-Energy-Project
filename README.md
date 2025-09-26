# React Native BLE & Charting Demo

This project showcases essential mobile development capabilities with **React Native**.
The application demonstrates two core features:

* **Real-time, two-way data communication** with a hardware device via **Bluetooth Low Energy (BLE)**.
* **Data visualization** through a **heat map chart**.

---
## 🎥 Video Demonstration:
https://vimeo.com/1122358499?share=copy

---

## ✨ Key Features

### 🔹 Bluetooth Low Energy (BLE) Communication

* Built with [`react-native-ble-manager`](https://github.com/innoveit/react-native-ble-manager).
* Scans for nearby BLE peripherals.
* Establishes a connection to a real BLE device by UUID.
* Discovers device services and characteristics.
* Demonstrates **two-way communication**:

  * Sending string data to the peripheral.
  * Receiving string data back.

### 🔹 Data Visualization

* Dedicated screen with a **heat map chart**.
* Chart populated with placeholder data to illustrate visualization capabilities.

---

## 🛠️ Technologies Used

* **Framework:** React Native (CLI)
* **Bluetooth:** [react-native-ble-manager](https://github.com/innoveit/react-native-ble-manager)
* **Permissions:** [react-native-permissions](https://github.com/zoontek/react-native-permissions)
* **Language:** TypeScript
* **Android Build System:** Gradle

---

## 🚀 Getting Started

Follow these steps to run the project locally:

### 1. Clone the repository

```bash
git clone https://github.com/your-username/your-repository-name.git
cd BleDemoProject
```

### 2. Install dependencies

```bash
yarn install
```

### 3. Set up the Android environment

Ensure you have installed and configured:

* **Android SDK**
* **JDK 17**
* A physical Android device with **USB Debugging enabled**

📌 BLE features require a real device (not an emulator).

### 4. Run the application

Connect your device via USB and run:

```bash
yarn react-native run-android
```

---

## 📌 Notes

* On first launch, ensure required **Bluetooth and Location permissions** are granted.
* The heat map chart uses placeholder data but can be adapted to real-time BLE input.

---

