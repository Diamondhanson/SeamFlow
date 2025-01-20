import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Calendar, MarkedDates } from 'react-native-calendars';
import { useClients } from '../context/clientContext';
import { colors } from '../theme/colors';
import { textVariants } from '../theme/textVariants';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import { useNavigation } from '@react-navigation/native';
import Header from '../components/Header';

const CalendarScreen = () => {
  const navigation = useNavigation();
  const { clients } = useClients();

  // Process all due dates and create marked dates object
  const markedDates = useMemo(() => {
    const dates: MarkedDates = {};
    
    clients.forEach(client => {
      client.orders.forEach(order => {
        const dueDate = order.dateDelivery;
        if (dates[dueDate]) {
          // If date already exists, increment dots
          dates[dueDate].dots.push({
            key: order.id,
            color: colors.primary,
          });
        } else {
          // Create new marked date
          dates[dueDate] = {
            marked: true,
            dots: [{
              key: order.id,
              color: colors.primary,
            }],
          };
        }
      });
    });

    return dates;
  }, [clients]);

  // Get orders due on selected date
  const getDueDatesForDay = (date: string) => {
    const dueOrders = [];
    clients.forEach(client => {
      client.orders.forEach(order => {
        if (order.dateDelivery === date) {
          dueOrders.push({
            ...order,
            clientName: client.fullName,
          });
        }
      });
    });
    return dueOrders;
  };

  const [selectedDate, setSelectedDate] = React.useState(new Date().toISOString().split('T')[0]);
  const dueOrders = getDueDatesForDay(selectedDate);

  return (
    <SafeAreaWrapper>
      <View style={styles.container}>
        <Header 
          title="Calendar" 
          onBack={() => navigation.goBack()} 
        />

        <Calendar
          style={styles.calendar}
          theme={{
            backgroundColor: 'transparent',
            calendarBackground: 'transparent',
            textSectionTitleColor: colors.mainText,
            selectedDayBackgroundColor: colors.primary,
            selectedDayTextColor: colors.mainText,
            todayTextColor: colors.primary,
            dayTextColor: colors.mainText,
            textDisabledColor: colors.subText,
            dotColor: colors.primary,
            monthTextColor: colors.mainText,
            arrowColor: colors.mainText,
          }}
          markingType={'multi-dot'}
          markedDates={{
            ...markedDates,
            [selectedDate]: {
              ...(markedDates[selectedDate] || {}),
              selected: true,
            },
          }}
          onDayPress={day => setSelectedDate(day.dateString)}
        />

        <View style={styles.ordersContainer}>
          <Text style={styles.ordersTitle}>
            Orders Due {new Date(selectedDate).toLocaleDateString()}
          </Text>
          <ScrollView style={styles.ordersList}>
            {dueOrders.length > 0 ? (
              dueOrders.map((order) => (
                <View key={order.id} style={styles.orderItem}>
                  <View style={styles.orderHeader}>
                    <Text style={styles.orderName}>{order.orderName}</Text>
                    <View style={[styles.statusBadge, styles[order.status]]}>
                      <Text style={styles.statusText}>{order.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.clientName}>Client: {order.clientName}</Text>
                  {order.notes && (
                    <Text style={styles.notes}>{order.notes}</Text>
                  )}
                </View>
              ))
            ) : (
              <Text style={styles.noOrders}>No orders due on this date</Text>
            )}
          </ScrollView>
        </View>
      </View>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    color: colors.mainText,
    fontSize: 18,
  },
  title: {
    fontSize: textVariants.H2.fontSize,
    color: colors.mainText,
    fontWeight: 'bold',
  },
  calendar: {
    marginBottom: 20,
    height: 360,
    borderRadius: 12,
    backgroundColor: '#ffffff08',
    padding: 10,
    marginTop: 16,
  },
  ordersContainer: {
    flex: 1,
    backgroundColor: '#ffffff08',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
  },
  ordersTitle: {
    fontSize: textVariants.H6.fontSize,
    color: colors.mainText,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  ordersList: {
    flex: 1,
  },
  orderItem: {
    backgroundColor: '#ffffff15',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.mainText,
  },
  clientName: {
    fontSize: 16,
    color: colors.mainText,
    marginBottom: 8,
  },
  notes: {
    fontSize: 14,
    color: colors.subText,
  },
  noOrders: {
    color: colors.subText,
    textAlign: 'center',
    marginTop: 20,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  registered: {
    backgroundColor: colors.primary,
  },
  in_progress: {
    backgroundColor: '#ffd700',
  },
  testing: {
    backgroundColor: '#87ceeb',
  },
  on_pause: {
    backgroundColor: '#ff6b6b',
  },
  delivered: {
    backgroundColor: '#90EE90',
  },
});

export default CalendarScreen;
