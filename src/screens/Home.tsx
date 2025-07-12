import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  AppState,
  AppStateStatus,
} from "react-native";
import React, { useState, useEffect, useRef } from "react";
import { colors } from "../theme/colors";
import { textVariants } from "../theme/textVariants";
import { spacing } from "../theme/spacing";
import { defaultStyles, themeUtils } from "../theme";
import Icons from "react-native-vector-icons/FontAwesome5";
import { useNavigation } from "@react-navigation/native";
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import OverviewModal from '../components/OverviewModal';
import { useApp } from '../context/AppContext';
import { supabase } from "@/supabaseConfig";
import * as Device from 'expo-device';
import { useTranslation } from '../hooks/useTranslation';

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const isTablet = SCREEN_WIDTH >= 768;

// Define the tile data structure with enhanced styling
interface TileData {
  id: string;
  title: string;
  icon: string;
  route: string;
  description: string;
  color: string;
  gradient: string[];
}

const Home = () => {
  const navigation = useNavigation();
  const { companyInfo, user, sendTestNotification, notificationPermissionStatus, hasPinSet } = useApp();
  const { t } = useTranslation();

  // Define the tiles data with craft aesthetic - moved inside component to use translations
  const TILES_DATA: TileData[] = [
    {
      id: '1',
      title: t('navigation.newOrder'),
      description: 'Create custom orders',
      icon: 'plus-circle',
      route: 'NewOrder',
      color: colors.primary,
      gradient: [colors.primary, colors.primaryDark],
    },
    {
      id: '2',
      title: t('navigation.myClients'),
      description: 'Manage client profiles',
      icon: 'users',
      route: 'MyClients',
      color: colors.secondary,
      gradient: [colors.secondary, colors.secondaryDark],
    },
    {
      id: '3',
      title: t('navigation.myDesigns'),
      description: 'Design gallery',
      icon: 'palette',
      route: 'MyDesigns',
      color: colors.accent,
      gradient: [colors.accent, colors.accentDark],
    },
    {
      id: '4',
      title: t('navigation.calendar'),
      description: 'Delivery schedule',
      icon: 'calendar-alt',
      route: 'Calendar',
      color: colors.info,
      gradient: [colors.info, '#2563eb'],
    },
    {
      id: '5',
      title: t('navigation.myInspirations'),
      description: 'Creative references',
      icon: 'lightbulb',
      route: 'MyInspirations',
      color: colors.warning,
      gradient: [colors.warning, '#d97706'],
    },
    {
      id: '6',
      title: t('navigation.bulkOrder'),
      description: 'Large volume orders',
      icon: 'boxes',
      route: 'BulkOrder',
      color: colors.success,
      gradient: [colors.success, '#059669'],
    }
  ];
  const [dimensions, setDimensions] = useState({ 
    window: Dimensions.get('window') 
  });

  // Quick Overview State
  const [overview, setOverview] = useState({
    loading: true,
    activeOrders: 0,
    dueThisWeek: 0,
    dueToday: 0,
  });

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState<'active' | 'week' | 'today'>('active');
  
  // Test Notification State
  const [testingNotification, setTestingNotification] = useState(false);

  // PIN protection state
  const [pinChecked, setPinChecked] = useState(false); // Start as false, set to true only after PIN validation
  const lastActiveTime = useRef(Date.now());
  const PIN_TIMEOUT = 10 * 60 * 1000; // 10 minutes in milliseconds
  
  // Track if we've had a user before (to detect session expiration)
  const [hadUser, setHadUser] = useState(false);

  // Check if PIN is required when component loads
  useEffect(() => {
    // Add a small delay to allow navigation focus listener to run first
    const timer = setTimeout(() => {
      if (hasPinSet && !pinChecked) {
        // PIN is set but not checked, require PIN entry
        navigation.reset({
          index: 0,
          routes: [{ name: 'PinEntry' as never }],
        });
      }
    }, 100); // Small delay to allow other effects to run first

    return () => clearTimeout(timer);
  }, [hasPinSet, pinChecked, navigation]);

  // Handle app state changes for PIN timeout
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && hasPinSet && pinChecked) {
        // App is coming to foreground
        const now = Date.now();
        const timeDiff = now - lastActiveTime.current;
        
                 if (timeDiff > PIN_TIMEOUT) {
           setPinChecked(false);
           navigation.reset({
             index: 0,
             routes: [{ name: 'PinEntry' as never }],
           });
         }
      } else if (nextAppState.match(/inactive|background/)) {
        // App is going to background
        lastActiveTime.current = Date.now();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [hasPinSet, pinChecked, navigation]);

  // Reset PIN check when returning from PinEntry
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // If we're coming back to Home screen from somewhere other than PinEntry, 
      // and PIN is not required, mark PIN as checked
      if (!hasPinSet) {
        setPinChecked(true);
      } else {
        // If PIN is set and we're on Home screen, assume PIN was validated
        setPinChecked(true);
      }
      lastActiveTime.current = Date.now();
    });

    return unsubscribe;
  }, [navigation, hasPinSet]);

  // Handle session expiration during runtime
  useEffect(() => {
    if (user) {
      setHadUser(true);
    } else if (hadUser) {
      // We had a user before but now we don't - session expired
      navigation.reset({
        index: 0,
        routes: [{ name: 'Welcome' as never }],
      });
    }
  }, [user, hadUser, navigation]);

  const openModal = (tab: 'active' | 'week' | 'today') => {
    setModalInitialTab(tab);
    setModalVisible(true);
  };

  const handleTestNotification = async () => {
    if (!user) return;
    
    setTestingNotification(true);
    try {
      await sendTestNotification();
      // You could add a success toast here
      console.log('Test notification sent successfully!');
    } catch (error) {
      console.error('Failed to send test notification:', error);
      // You could add an error toast here
    } finally {
      setTestingNotification(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setOverview({ loading: true, activeOrders: 0, dueThisWeek: 0, dueToday: 0 });
      return;
    }
    
    const fetchOverview = async () => {
      setOverview(prev => ({ ...prev, loading: true }));
      try {
        // Get today's and week's date range
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay()); // Sunday
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6); // Saturday
        const weekStartStr = weekStart.toISOString().split('T')[0];
        const weekEndStr = weekEnd.toISOString().split('T')[0];

        // Optimized: Fetch all simple orders data in one query
        const { data: simpleOrders, error: simpleError } = await supabase
          .from('orders')
          .select('id, date_delivery')
          .eq('user_id', user.id);

        // Optimized: Fetch all bulk orders data in one query  
        const { data: bulkOrders, error: bulkError } = await supabase
          .from('bulk_orders')
          .select('id, date_delivery')
          .eq('user_id', user.id);

        if (simpleError) {
          console.error('Simple orders error:', simpleError);
          throw simpleError;
        }
        
        if (bulkError) {
          console.error('Bulk orders error:', bulkError);
          throw bulkError;
        }

        // Calculate stats from fetched data
        const allOrders = [...(simpleOrders || []), ...(bulkOrders || [])];
        const activeOrders = allOrders.length;
        
        const dueThisWeek = allOrders.filter(order => 
          order.date_delivery >= weekStartStr && order.date_delivery <= weekEndStr
        ).length;
        
        const dueToday = allOrders.filter(order => 
          order.date_delivery === todayStr
        ).length;

        setOverview({
          loading: false,
          activeOrders,
          dueThisWeek,
          dueToday,
        });
      } catch (e) {
        console.error('Error fetching overview:', e);
        setOverview({
          loading: false,
          activeOrders: 0,
          dueThisWeek: 0,
          dueToday: 0,
        });
      }
    };
    
    fetchOverview();
  }, [user]);

  useEffect(() => {
    const subscription = Dimensions.addEventListener(
      'change',
      ({ window }) => {
        setDimensions({ window });
      }
    );
    return () => subscription?.remove();
  }, []);

  const { width } = dimensions.window;
  const isTabletLayout = width >= 768;
  const tileWidth = isTabletLayout ? 
    (width - (spacing.pageTablet * 2) - (spacing.cardGap * 2)) / 3 : 
    (width - (spacing.page * 2) - spacing.cardGap) / 2;
  const tileHeight = isTabletLayout ? 160 : 140;
  const containerPadding = isTabletLayout ? spacing.pageTablet : spacing.page;

  const renderTile = ({ id, title, description, icon, route, color }: TileData) => (
    <TouchableOpacity 
      key={id}
      style={[
        styles.tile,
        { 
          width: tileWidth, 
          height: tileHeight,
          backgroundColor: color,
        }
      ]}
      onPress={() => (navigation as any).navigate(route)}
      activeOpacity={0.8}
    >
      <View style={styles.tileContent}>
        <View style={styles.tileHeader}>
          <Icons 
            name={icon} 
            size={isTabletLayout ? 28 : 24} 
            color={colors.textOnPrimary}
            style={styles.tileIcon}
          />
        </View>
        
        <View style={styles.tileFooter}>
          <Text style={[
            styles.tileTitle,
            { fontSize: isTabletLayout ? 16 : 14 }
          ]}>
            {title}
          </Text>
          <Text style={[
            styles.tileDescription,
            { fontSize: isTabletLayout ? 12 : 11 }
          ]}>
            {description}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaWrapper>
      <ScrollView 
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={[
          styles.headerSection,
          { paddingHorizontal: containerPadding }
        ]}>
          <View style={styles.companyInfoSection}>
            {companyInfo.logo ? (
              <Image 
                source={{ uri: companyInfo.logo }} 
                style={styles.companyLogo} 
                resizeMode="cover"
              />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Icons name="store" size={24} color={colors.textSecondary} />
              </View>
            )}
            
            <View style={styles.companyTextSection}>
              <Text style={styles.companyName}>
                {companyInfo.name}
              </Text>
              <Text style={styles.welcomeSubtext}>
                {t('pin.welcomeBack')}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings' as never)}
            style={styles.settingsButton}
          >
            <Icons name="cog" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Quick Stats Section */}
        <View style={[
          styles.statsSection,
          { paddingHorizontal: containerPadding }
        ]}>
          <Text style={styles.sectionTitle}>{t('home.quickActions')}</Text>
          <View style={styles.statsRow}>
            <TouchableOpacity 
              style={[styles.statCard, styles.activeOrdersCard]}
              onPress={() => openModal('active')}
              activeOpacity={0.8}
            >
              {overview.loading ? (
                <ActivityIndicator size="small" color={colors.textOnPrimary} />
              ) : (
                <Text style={[styles.statNumber, styles.activeOrdersNumber]}>{overview.activeOrders}</Text>
              )}
              <Text style={[styles.statLabel, styles.activeOrdersLabel]}>{t('home.activeOrders')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.statCard, styles.dueWeekCard]}
              onPress={() => openModal('week')}
              activeOpacity={0.8}
            >
              {overview.loading ? (
                <ActivityIndicator size="small" color={colors.textOnPrimary} />
              ) : (
                <Text style={[styles.statNumber, styles.dueWeekNumber]}>{overview.dueThisWeek}</Text>
              )}
              <Text style={[styles.statLabel, styles.dueWeekLabel]}>{t('home.dueThisWeek')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.statCard, styles.dueTodayCard]}
              onPress={() => openModal('today')}
              activeOpacity={0.8}
            >
              {overview.loading ? (
                <ActivityIndicator size="small" color={colors.textOnPrimary} />
              ) : (
                <Text style={[styles.statNumber, styles.dueTodayNumber]}>{overview.dueToday}</Text>
              )}
              <Text style={[styles.statLabel, styles.dueTodayLabel]}>{t('home.dueToday')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Actions Section */}
        <View style={[
          styles.actionsSection,
          { paddingHorizontal: containerPadding }
        ]}>
          <Text style={styles.sectionTitle}>{t('home.quickActions')}</Text>
          <View style={styles.tilesContainer}>
            {TILES_DATA.map(renderTile)}
          </View>
        </View>

        {/* Test Notification Section */}
        <View style={[
          styles.testSection,
          { paddingHorizontal: containerPadding }
        ]}>
          <Text style={styles.sectionTitle}>{t('home.developerTesting')}</Text>
          <TouchableOpacity
            style={[
              styles.testButton,
              testingNotification && styles.testButtonLoading
            ]}
            onPress={handleTestNotification}
            disabled={testingNotification || !user}
            activeOpacity={0.8}
          >
            {testingNotification ? (
              <ActivityIndicator size="small" color={colors.textOnPrimary} />
            ) : (
              <Icons name="bell" size={20} color={colors.textOnPrimary} />
            )}
            <Text style={styles.testButtonText}>
              {testingNotification ? t('home.sending') : t('home.sendTestNotification')}
            </Text>
          </TouchableOpacity>
          
          <View style={styles.notificationStatus}>
            <Text style={styles.statusText}>
              {t('home.notificationStatus', { status: notificationPermissionStatus })}
            </Text>
            {notificationPermissionStatus !== 'granted' && (
                              <Text style={styles.statusHint}>
                  {t('home.enableNotifications')}
                </Text>
            )}
            
            {/* Add simulator-specific message */}
            <Text style={styles.deviceInfo}>
              🖥️ Device: {Device.isDevice ? 'Physical Device' : 'Simulator'}
            </Text>
            {!Device.isDevice && (
              <Text style={styles.simulatorHint}>
                💡 On simulator: Test button will show local notifications.{'\n'}
                📱 For push notifications: Test on physical device.
              </Text>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Overview Modal */}
      <OverviewModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        initialTab={modalInitialTab}
      />
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    paddingBottom: spacing.xl,
  },
  
  // Header Section
  headerSection: {
    paddingTop: spacing.l,
    paddingBottom: spacing.section,
  },
  companyInfoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.m,
  },
  companyLogo: {
    width: 48,
    height: 48,
    borderRadius: spacing.borderRadius.l,
    backgroundColor: colors.surfaceElevated,
  },
  logoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: spacing.borderRadius.l,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  companyTextSection: {
    flex: 1,
    marginLeft: spacing.m,
  },
  companyName: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: colors.text,
    letterSpacing: 0.3,
    lineHeight: 28,
  },
  welcomeSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
    letterSpacing: 0.2,
    lineHeight: 18,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: spacing.borderRadius.round,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...themeUtils.getElevation('xs'),
  },

  // Stats Section
  statsSection: {
    marginBottom: spacing.section,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: spacing.m,
    letterSpacing: 0.2,
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.cardGap,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.l,
    padding: spacing.m,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...themeUtils.getElevation('xs'),
  },
  
  // Colorful stat card variants
  activeOrdersCard: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  dueWeekCard: {
    backgroundColor: colors.warning,
    borderColor: '#d97706',
  },
  dueTodayCard: {
    backgroundColor: colors.success,
    borderColor: '#059669',
  },
  
  statNumber: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: colors.primary,
    lineHeight: 28,
  },
  
  // Colorful stat number variants
  activeOrdersNumber: {
    color: colors.textOnPrimary,
  },
  dueWeekNumber: {
    color: colors.textOnPrimary,
  },
  dueTodayNumber: {
    color: colors.textOnPrimary,
  },
  
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    letterSpacing: 0.3,
    lineHeight: 16,
  },
  
  // Colorful stat label variants
  activeOrdersLabel: {
    color: colors.textOnPrimary,
    opacity: 0.9,
  },
  dueWeekLabel: {
    color: colors.textOnPrimary,
    opacity: 0.9,
  },
  dueTodayLabel: {
    color: colors.textOnPrimary,
    opacity: 0.9,
  },

  // Actions Section
  actionsSection: {
    flex: 1,
  },
  tilesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.cardGap,
    justifyContent: 'space-between',
  },
  
  // Tile Styles
  tile: {
    borderRadius: spacing.borderRadius.xl,
    overflow: 'hidden',
    ...themeUtils.getElevation('s'),
    marginBottom: spacing.cardGap,
  },
  tileContent: {
    flex: 1,
    padding: spacing.m,
    justifyContent: 'space-between',
  },
  tileHeader: {
    alignItems: 'flex-end',
  },
  tileIcon: {
    opacity: 0.9,
  },
  tileFooter: {
    alignItems: 'flex-start',
  },
  tileTitle: {
    fontWeight: '600' as const,
    color: colors.textOnPrimary,
    letterSpacing: 0.2,
    lineHeight: 18,
    marginBottom: 2,
  },
  tileDescription: {
    color: colors.textOnPrimary,
    opacity: 0.8,
    letterSpacing: 0.1,
    lineHeight: 14,
  },

  // Test Section Styles
  testSection: {
    marginTop: spacing.section,
    marginBottom: spacing.l,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: spacing.borderRadius.l,
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.l,
    gap: spacing.s,
    ...themeUtils.getElevation('s'),
  },
  testButtonLoading: {
    opacity: 0.7,
  },
  testButtonText: {
    color: colors.textOnPrimary,
    fontSize: 16,
    fontWeight: '600' as const,
    letterSpacing: 0.2,
  },
  notificationStatus: {
    marginTop: spacing.m,
    padding: spacing.m,
    backgroundColor: colors.surfaceElevated,
    borderRadius: spacing.borderRadius.m,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  statusText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500' as const,
    marginBottom: spacing.xs,
  },
  statusHint: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  deviceInfo: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  simulatorHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default Home;
