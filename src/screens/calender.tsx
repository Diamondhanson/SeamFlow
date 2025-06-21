import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Platform } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useClients } from '../context/clientContext';
import { colors } from '../theme/colors';
import { textVariants } from '../theme/textVariants';
import { spacing } from '../theme/spacing';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import { useNavigation } from '@react-navigation/native';
import Header from '../components/Header';
import Icons from "react-native-vector-icons/FontAwesome5";

// Define MarkedDates type locally since it's not exported from the library
type MarkedDates = {
  [date: string]: {
    marked?: boolean;
    selected?: boolean;
    dots?: Array<{key: string; color: string}>;
  };
};

// Get responsive dimensions
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isTablet = SCREEN_WIDTH >= 768;

const CalendarScreen = () => {
  const navigation = useNavigation();
  const { clients } = useClients();

  // Process all due dates and create marked dates object
  const markedDates: MarkedDates = useMemo(() => {
    const dates: MarkedDates = {};
    
    clients.forEach(client => {
      client.orders.forEach(order => {
        const dueDate = order.dateDelivery;
        
        // Skip if date is invalid
        if (!dueDate || !dueDate.match(/^\d{4}-\d{2}-\d{2}$/)) return;
        
        if (dates[dueDate]) {
          // If date already exists, increment dots
          dates[dueDate].dots?.push({
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
    const dueOrders: Array<any> = [];
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

  // Map the order status to the correct style and colors
  const getStatusStyle = (status: string) => {
    const statusMap: {[key: string]: { backgroundColor: string; textColor: string }} = {
      'registered': { backgroundColor: colors.statusRegistered, textColor: colors.textOnPrimary },
      'in_progress': { backgroundColor: colors.statusInProgress, textColor: colors.textOnSecondary },
      'in-progress': { backgroundColor: colors.statusInProgress, textColor: colors.textOnSecondary },
      'testing': { backgroundColor: colors.statusTesting, textColor: colors.textOnPrimary },
      'on_pause': { backgroundColor: colors.statusPaused, textColor: colors.textOnPrimary },
      'on-pause': { backgroundColor: colors.statusPaused, textColor: colors.textOnPrimary },
      'delivered': { backgroundColor: colors.statusDelivered, textColor: colors.textOnPrimary },
      'completed': { backgroundColor: colors.statusDelivered, textColor: colors.textOnPrimary },
    };
    
    return statusMap[status] || { backgroundColor: colors.statusRegistered, textColor: colors.textOnPrimary };
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <SafeAreaWrapper>
      <View style={styles.container}>
        <Header 
          title="Calendar" 
          onBack={() => navigation.goBack()} 
        />

        {/* Calendar Section */}
        <View style={styles.calendarSection}>
          <Calendar
            style={styles.calendar}
            theme={{
              backgroundColor: 'transparent',
              calendarBackground: 'transparent',
              textSectionTitleColor: colors.text,
              selectedDayBackgroundColor: colors.primary,
              selectedDayTextColor: colors.textOnPrimary,
              todayTextColor: colors.primary,
              dayTextColor: colors.text,
              textDisabledColor: colors.textTertiary,
              dotColor: colors.primary,
              monthTextColor: colors.text,
              arrowColor: colors.text,
              textDayFontFamily: 'System',
              textMonthFontFamily: 'System',
              textDayHeaderFontFamily: 'System',
              textDayFontSize: isTablet ? 16 : 14,
              textMonthFontSize: isTablet ? 18 : 16,
              textDayHeaderFontSize: isTablet ? 14 : 12,
            }}
            markingType={'multi-dot'}
            markedDates={{
              ...markedDates,
              [selectedDate]: {
                ...(markedDates[selectedDate] || {}),
                selected: true,
              },
            }}
            onDayPress={(day: any) => setSelectedDate(day.dateString)}
          />
        </View>

        {/* Orders Section */}
        <View style={styles.ordersSection}>
          <View style={styles.ordersSectionHeader}>
            <View style={styles.ordersTitleContainer}>
              <Icons name="clipboard-list" size={isTablet ? 22 : 20} color={colors.primary} />
              <Text style={styles.ordersTitle}>
                Orders Due
              </Text>
            </View>
            <Text style={styles.ordersDate}>
              {formatDate(selectedDate)}
            </Text>
          </View>

          <ScrollView 
            style={styles.ordersList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.ordersScrollContent}
          >
            {dueOrders.length > 0 ? (
              dueOrders.map((order, index) => {
                const statusStyle = getStatusStyle(order.status);
                return (
                  <TouchableOpacity 
                    key={order.id} 
                    style={styles.orderCard}
                    activeOpacity={0.7}
                  >
                    <View style={styles.orderHeader}>
                      <View style={styles.orderTitleContainer}>
                        <Text style={styles.orderName}>{order.orderName}</Text>
                        <Text style={styles.clientName}>
                          <Icons name="user" size={12} color={colors.textSecondary} /> {order.clientName}
                        </Text>
                      </View>
                      <View style={[
                        styles.statusBadge, 
                        { backgroundColor: statusStyle.backgroundColor }
                      ]}>
                        <Text style={[
                          styles.statusText,
                          { color: statusStyle.textColor }
                        ]}>
                          {order.status.replace(/[_-]/g, ' ').toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    
                    {order.notes && (
                      <View style={styles.notesContainer}>
                        <Text style={styles.notesLabel}>Notes:</Text>
                        <Text style={styles.notes}>{order.notes}</Text>
                      </View>
                    )}
                    
                    <View style={styles.orderFooter}>
                      <View style={styles.dueDateContainer}>
                        <Icons name="clock" size={12} color={colors.primary} />
                        <Text style={styles.dueDateText}>Due Today</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.emptyState}>
                <Icons name="calendar-check" size={48} color={colors.textTertiary} />
                <Text style={styles.emptyStateTitle}>No Orders Due</Text>
                <Text style={styles.emptyStateSubtitle}>
                  No orders are scheduled for delivery on this date
                </Text>
              </View>
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
    backgroundColor: colors.background,
    paddingHorizontal: isTablet ? spacing.pageTablet : spacing.page,
  },
  
  // Calendar Section
  calendarSection: {
    marginTop: spacing.m,
    marginBottom: spacing.l,
  },
  calendar: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.l,
    padding: spacing.m,
    // Add subtle shadow
    ...Platform.select({
      ios: {
        shadowColor: colors.cardShadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },

  // Orders Section
  ordersSection: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.l,
    padding: spacing.card,
    // Add subtle shadow
    ...Platform.select({
      ios: {
        shadowColor: colors.cardShadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  ordersSectionHeader: {
    marginBottom: spacing.m,
  },
  ordersTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  ordersTitle: {
    fontSize: textVariants.h4.fontSize,
    lineHeight: textVariants.h4.lineHeight,
    fontWeight: textVariants.h4.fontWeight,
    color: colors.text,
    marginLeft: spacing.s,
  },
  ordersDate: {
    fontSize: textVariants.bodySmall.fontSize,
    lineHeight: textVariants.bodySmall.lineHeight,
    fontWeight: textVariants.bodySmall.fontWeight,
    color: colors.textSecondary,
  },
  ordersList: {
    flex: 1,
  },
  ordersScrollContent: {
    paddingBottom: spacing.m,
  },

  // Order Card
  orderCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: spacing.borderRadius.m,
    padding: spacing.card,
    marginBottom: spacing.cardGap,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.s,
  },
  orderTitleContainer: {
    flex: 1,
    marginRight: spacing.s,
  },
  orderName: {
    fontSize: textVariants.h6.fontSize,
    lineHeight: textVariants.h6.lineHeight,
    fontWeight: textVariants.h6.fontWeight,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  clientName: {
    fontSize: textVariants.bodySmall.fontSize,
    lineHeight: textVariants.bodySmall.lineHeight,
    fontWeight: textVariants.bodySmall.fontWeight,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
    borderRadius: spacing.borderRadius.s,
    minWidth: 80,
    alignItems: 'center',
  },
  statusText: {
    fontSize: isTablet ? 11 : 10,
    lineHeight: isTablet ? 14 : 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  // Notes Section
  notesContainer: {
    marginTop: spacing.s,
    padding: spacing.s,
    backgroundColor: colors.backgroundTertiary,
    borderRadius: spacing.borderRadius.s,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  notesLabel: {
    fontSize: textVariants.label.fontSize,
    lineHeight: textVariants.label.lineHeight,
    fontWeight: textVariants.label.fontWeight,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  notes: {
    fontSize: textVariants.body.fontSize,
    lineHeight: textVariants.body.lineHeight,
    fontWeight: textVariants.body.fontWeight,
    color: colors.text,
  },

  // Order Footer
  orderFooter: {
    marginTop: spacing.s,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dueDateText: {
    fontSize: textVariants.caption.fontSize,
    lineHeight: textVariants.caption.lineHeight,
    color: colors.primary,
    marginLeft: spacing.xs,
    fontWeight: '600',
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyStateTitle: {
    fontSize: textVariants.h5.fontSize,
    lineHeight: textVariants.h5.lineHeight,
    fontWeight: textVariants.h5.fontWeight,
    color: colors.textSecondary,
    marginTop: spacing.m,
    marginBottom: spacing.s,
  },
  emptyStateSubtitle: {
    fontSize: textVariants.body.fontSize,
    lineHeight: textVariants.body.lineHeight,
    fontWeight: textVariants.body.fontWeight,
    color: colors.textTertiary,
    textAlign: 'center',
    maxWidth: 280,
  },
});

export default CalendarScreen;
