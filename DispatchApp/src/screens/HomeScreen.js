import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image,
  TouchableOpacity, Animated, Dimensions, ImageBackground, Pressable
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getData, STORAGE_KEYS } from '../utils/storage';
import { useIsFocused } from '@react-navigation/native';
import { colors, spacing } from '../theme/colors';

const { width } = Dimensions.get('window');

// --- Reusable Stat Card ---
function StatCard({ icon, label, value, accentColor }) {
  const scale = useRef(new Animated.Value(1)).current;
  
  const animIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
  const animOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  return (
    <Pressable 
      onPressIn={animIn} 
      onPressOut={animOut}
      style={({ pressed }) => [
        styles.statCard,
        { transform: [{ scale }] }
      ]}
    >
      <View style={[styles.statAccent, { backgroundColor: accentColor }]} />
      <View style={styles.statContent}>
        <View style={styles.statHeader}>
          <View style={[styles.statIconWrapper, { backgroundColor: accentColor + '15' }]}>
            <Text style={styles.statIcon}>{icon}</Text>
          </View>
          <Text style={styles.statValue}>{value}</Text>
        </View>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </Pressable>
  );
}

// --- Reusable Action Button ---
function ActionBtn({ icon, title, subtitle, onPress, primary }) {
  const scale = useRef(new Animated.Value(1)).current;
  const animIn = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start();
  const animOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  const ButtonContent = (
    <View style={styles.actionBtnInner}>
      <View style={[styles.actionIconCircle, { backgroundColor: primary ? 'rgba(255,255,255,0.2)' : colors.primary + '15' }]}>
        <Text style={[styles.actionBtnIcon, { color: primary ? colors.white : colors.primary }]}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.actionBtnTitle, { color: primary ? colors.white : colors.text }]}>{title}</Text>
        <Text style={[styles.actionBtnSub, { color: primary ? 'rgba(255,255,255,0.8)' : colors.textLight }]}>{subtitle}</Text>
      </View>
    </View>
  );

  return (
    <Animated.View style={{ transform: [{ scale }], flex: 1 }}>
      <Pressable
        onPress={onPress}
        onPressIn={animIn}
        onPressOut={animOut}
        style={({ pressed }) => [
          styles.actionBtn,
          primary ? styles.actionBtnPrimary : styles.actionBtnSecondary,
          { elevation: pressed ? 2 : 4 }
        ]}
      >
        {primary ? (
          <LinearGradient
            colors={colors.primaryGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.actionBtnGradient}
          >
            {ButtonContent}
          </LinearGradient>
        ) : ButtonContent}
      </Pressable>
    </Animated.View>
  );
}

export default function HomeScreen({ navigation }) {
  const isFocused = useIsFocused();
  const [stats, setStats] = useState({ dispatched: 0, value: 0, networks: 0 });
  const [recentActivity, setRecentActivity] = useState([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isFocused) {
      loadStats();
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    }
  }, [isFocused]);

  const loadStats = async () => {
    try {
      const hData = await getData(STORAGE_KEYS.HISTORY);
      const nData = await getData(STORAGE_KEYS.NETWORKS);
      const history = Array.isArray(hData) ? hData : [];
      const networks = Array.isArray(nData) ? nData : [];
      
      const totalVehicles = history.reduce((sum, d) => sum + (d?.items?.length || 0), 0);
      const totalValue = history.reduce((sum, d) => sum + Number(d?.totalAmount || 0), 0);
      setStats({ dispatched: totalVehicles, value: totalValue, networks: networks.length });
      setRecentActivity([...history].reverse().slice(0, 5));
    } catch (e) {
      console.warn("loadStats Error", e);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── HEADER / HERO ── */}
        <View style={styles.heroWrapper}>
          <LinearGradient
            colors={colors.primaryGradient}
            style={styles.heroGradient}
          >
            <View style={styles.heroContent}>
              <View style={styles.heroHeaderRow}>
                <View style={styles.logoCircle}>
                  <Image
                    source={require('../../logo.png')}
                    style={styles.heroLogo}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.heroTextContainer}>
                  <Text style={styles.heroTitle}>My Shiva Honda</Text>
                  <Text style={styles.heroSubtitle}>Dealership Management System</Text>
                </View>
              </View>
              
              <View style={styles.locationBadge}>
                <Text style={styles.locationText}>📍 Biaora, Rajgarh</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        <Animated.View style={{ opacity: fadeAnim, marginTop: -30 }}>

          {/* ── STATS SECTION ── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Live Overview</Text>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
            <StatCard icon="🏍️" label="Dispatched" value={stats.dispatched} accentColor={colors.primary} />
            <StatCard icon="💰" label="Total Value" value={`\u20B9${(stats.value/1000).toFixed(1)}K`} accentColor={colors.success} />
            <StatCard icon="🏪" label="Networks" value={stats.networks} accentColor="#FF9500" />
          </ScrollView>

          {/* ── QUICK ACTIONS ── */}
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsContainer}>
            <ActionBtn
              icon="📦"
              title="New Dispatch"
              subtitle="Generate Invoice"
              primary
              onPress={() => navigation.navigate('NewDispatch')}
            />
            <ActionBtn
              icon="📋"
              title="History"
              subtitle="Logs & Exports"
              onPress={() => navigation.navigate('History')}
            />
          </View>

          {/* ── MASTERS GRID ── */}
          <Text style={styles.sectionTitle}>Database Management</Text>
          <View style={styles.mastersGrid}>
            {[
              { name: 'Network', icon: '🏢', color: '#007AFF', route: 'NetworkMaster' },
              { name: 'Models', icon: '🛵', color: colors.primary, route: 'ModelMaster' },
              { name: 'Colors', icon: '🎨', color: '#FF9500', route: 'ColorMaster' }
            ].map((master, idx) => (
              <TouchableOpacity 
                key={idx}
                style={styles.masterCard} 
                onPress={() => navigation.navigate(master.route)}
              >
                <View style={[styles.masterIconCircle, { backgroundColor: master.color + '15' }]}>
                  <Text style={[styles.masterIcon, { color: master.color }]}>{master.icon}</Text>
                </View>
                <Text style={styles.masterLabel}>{master.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── RECENT ACTIVITY ── */}
          <Text style={styles.sectionTitle}>Recent Dispatches</Text>
          {recentActivity.length === 0 ? (
            <View style={styles.emptyActivity}>
              <View style={styles.emptyIconCircle}>
                <Text style={{ fontSize: 40 }}>📭</Text>
              </View>
              <Text style={styles.emptyTitle}>No Recent Records</Text>
              <Text style={styles.emptySubtitle}>Start by creating your first dispatch to see activity here.</Text>
              <TouchableOpacity 
                style={styles.emptyCTA}
                onPress={() => navigation.navigate('NewDispatch')}
              >
                <Text style={styles.emptyCTAText}>Create Dispatch</Text>
              </TouchableOpacity>
            </View>
          ) : (
            recentActivity.map((d, i) => (
              <TouchableOpacity key={d.id} style={styles.activityItem} activeOpacity={0.7}>
                <View style={styles.activityIconCircle}>
                  <Text style={styles.activityIconText}>📦</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activityName}>{d.network?.networkName || 'Dealer'}</Text>
                  <Text style={styles.activityDate}>{d.date} • {d.items?.length || 0} Units</Text>
                </View>
                <View style={styles.activityValueContainer}>
                  <Text style={styles.activityValue}>{'\u20B9'}{Number(d.totalAmount).toLocaleString()}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}

          {/* ── FOOTER ── */}
          <View style={styles.footer}>
             <Text style={styles.footerNote}>Honda 2-Wheelers Authorized System</Text>
             <Text style={styles.footerBrand}>My Shiva Honda • Version 1.0.0</Text>
          </View>

        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: 60 },

  // HERO / HEADER
  heroWrapper: {
    overflow: 'hidden',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  heroGradient: {
    paddingTop: 70,
    paddingBottom: 60,
    paddingHorizontal: spacing.m,
  },
  heroContent: {
    alignItems: 'center',
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoCircle: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 18,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  heroLogo: {
    width: 45,
    height: 45,
  },
  heroTextContainer: {
    flexShrink: 1,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
    fontWeight: '500',
  },
  locationBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  locationText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // SECTION HEADERS
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: spacing.m,
    marginTop: 25,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginHorizontal: spacing.m,
    marginTop: 25,
    marginBottom: 15,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E60012',
    marginRight: 6,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#E60012',
  },

  // STATS
  statsScroll: {
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  statCard: {
    width: width * 0.42,
    backgroundColor: colors.white,
    marginHorizontal: 8,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  statAccent: {
    height: 4,
    width: '100%',
  },
  statContent: {
    padding: 16,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIcon: { fontSize: 16 },
  statValue: { fontSize: 20, fontWeight: '900', color: colors.text },
  statLabel: { fontSize: 11, color: colors.textLight, fontWeight: '600' },

  // QUICK ACTIONS
  actionsContainer: { 
    flexDirection: 'row',
    paddingHorizontal: spacing.m, 
    gap: 15 
  },
  actionBtn: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  actionBtnGradient: {
    padding: 18,
  },
  actionBtnInner: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: 18,
  },
  actionBtnPrimary: {
    flex: 1,
  },
  actionBtnSecondary: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionBtnIcon: { fontSize: 22 },
  actionBtnTitle: { fontSize: 16, fontWeight: '800' },
  actionBtnSub: { fontSize: 11, marginTop: 2, fontWeight: '500' },

  // MASTERS GRID
  mastersGrid: { 
    flexDirection: 'row', 
    paddingHorizontal: spacing.m, 
    justifyContent: 'space-between',
    gap: 12,
  },
  masterCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 18,
    paddingVertical: 20,
    alignItems: 'center',
    elevation: 3,
    shadowOpacity: 0.05,
    shadowRadius: 5,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  masterIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  masterIcon: { fontSize: 24 },
  masterLabel: { fontSize: 13, fontWeight: '700', color: colors.text },

  // ACTIVITY
  activityItem: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.m,
    marginBottom: 12,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowOpacity: 0.03,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#F8F8F8',
  },
  activityIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  activityIconText: { fontSize: 18 },
  activityName: { fontSize: 15, fontWeight: '800', color: colors.text },
  activityDate: { fontSize: 12, color: colors.textLight, marginTop: 2 },
  activityValueContainer: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  activityValue: { fontSize: 13, fontWeight: '900', color: '#2E7D32' },

  // EMPTY STATE
  emptyActivity: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.m,
    borderRadius: 24,
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    elevation: 3,
    shadowOpacity: 0.05,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  emptySubtitle: { fontSize: 13, color: colors.textLight, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  emptyCTA: {
    marginTop: 25,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  emptyCTAText: { color: colors.white, fontWeight: '800', fontSize: 14 },

  // FOOTER
  footer: { marginTop: 40, alignItems: 'center' },
  footerNote: { fontSize: 11, color: colors.textLight, fontWeight: '700', letterSpacing: 0.5 },
  footerBrand: { fontSize: 12, color: colors.textLight, fontWeight: '500', marginTop: 4, opacity: 0.6 },
});
