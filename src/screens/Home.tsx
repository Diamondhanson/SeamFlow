import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import React, { useState, useEffect } from "react";
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

// Define the tiles data with craft aesthetic
const TILES_DATA: TileData[] = [
  {
    id: '1',
    title: 'New Order',
    description: 'Create custom orders',
    icon: 'plus-circle',
    route: 'NewOrder',
    color: colors.primary,
    gradient: [colors.primary, colors.primaryDark],
  },
  {
    id: '2',
    title: 'My Clients',
    description: 'Manage client profiles',
    icon: 'users',
    route: 'MyClients',
    color: colors.secondary,
    gradient: [colors.secondary, colors.secondaryDark],
  },
  {
    id: '3',
    title: 'My Designs',
    description: 'Design gallery',
    icon: 'palette',
    route: 'MyDesigns',
    color: colors.accent,
    gradient: [colors.accent, colors.accentDark],
  },
  {
    id: '4',
    title: 'Calendar',
    description: 'Delivery schedule',
    icon: 'calendar-alt',
    route: 'Calendar',
    color: colors.info,
    gradient: [colors.info, '#2563eb'],
  },
  {
    id: '5',
    title: 'Inspirations',
    description: 'Creative references',
    icon: 'lightbulb',
    route: 'MyInspirations',
    color: colors.warning,
    gradient: [colors.warning, '#d97706'],
  },
  {
    id: '6',
    title: 'Bulk Orders',
    description: 'Large volume orders',
    icon: 'boxes',
    route: 'BulkOrder',
    color: colors.success,
    gradient: [colors.success, '#059669'],
  }
];

const Home = () => {
  const navigation = useNavigation();
  const { companyInfo, user } = useApp();
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

  const openModal = (tab: 'active' | 'week' | 'today') => {
    setModalInitialTab(tab);
    setModalVisible(true);
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
                Welcome back to your workspace
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
          <Text style={styles.sectionTitle}>Quick Overview</Text>
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
              <Text style={[styles.statLabel, styles.activeOrdersLabel]}>Active Orders</Text>
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
              <Text style={[styles.statLabel, styles.dueWeekLabel]}>Due This Week</Text>
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
              <Text style={[styles.statLabel, styles.dueTodayLabel]}>Due Today</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Actions Section */}
        <View style={[
          styles.actionsSection,
          { paddingHorizontal: containerPadding }
        ]}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.tilesContainer}>
            {TILES_DATA.map(renderTile)}
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
});

export default Home;
