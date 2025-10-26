import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';

export default function UserAgreementScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      {/* 头部导航 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>‹ 返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>用户协议</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* 更新日期 */}
          <Text style={styles.updateDate}>最后更新日期：2025年10月26日</Text>

          {/* 引言 */}
          <View style={styles.section}>
            <Text style={styles.welcomeText}>欢迎使用漂流瓶！</Text>
            <Text style={styles.sectionText}>
              本协议是您（以下称"用户"）与漂流瓶应用（以下称"本应用"或"我们"）之间的法律协议。
              请您仔细阅读以下条款。
            </Text>
            <Text style={styles.highlightText}>
              ⚠️ 您使用本应用即表示您已阅读、理解并同意接受本协议的全部内容。
            </Text>
          </View>

          {/* 1. 服务说明 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>一、服务说明</Text>
            <Text style={styles.sectionText}>
              1.1 本应用是一款社交应用，提供漂流瓶、动态分享、即时通讯等功能。
            </Text>
            <Text style={styles.sectionText}>
              1.2 我们保留随时修改、中断或终止部分或全部服务的权利。
            </Text>
            <Text style={styles.sectionText}>
              1.3 某些功能可能需要付费使用，具体以应用内说明为准。
            </Text>
          </View>

          {/* 2. 账号注册 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>二、账号注册与使用</Text>
            <Text style={styles.sectionText}>2.1 注册要求</Text>
            <Text style={styles.bulletText}>• 您必须年满18周岁或在监护人同意下使用本服务</Text>
            <Text style={styles.bulletText}>• 您应提供真实、准确的注册信息</Text>
            <Text style={styles.bulletText}>• 每个手机号只能注册一个账号</Text>
            <Text style={styles.bulletText}>• 性别信息一旦设置后不可更改</Text>
            
            <Text style={styles.sectionText}>2.2 账号安全</Text>
            <Text style={styles.bulletText}>• 您应妥善保管账号和密码</Text>
            <Text style={styles.bulletText}>• 不得将账号出售、出租或转让给他人</Text>
            <Text style={styles.bulletText}>• 如发现账号被盗用，应立即通知我们</Text>
            
            <Text style={styles.sectionText}>2.3 账号注销</Text>
            <Text style={styles.bulletText}>• 您可以随时申请注销账号</Text>
            <Text style={styles.bulletText}>• 注销后，您的个人数据将在7天后删除</Text>
            <Text style={styles.bulletText}>• 7天内重新登录可恢复账号</Text>
          </View>

          {/* 3. 用户行为规范 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>三、用户行为规范</Text>
            <Text style={styles.sectionText}>您在使用本应用时，不得有以下行为：</Text>
            <Text style={styles.forbiddenText}>✗ 发布违法、暴力、色情、赌博等违规内容</Text>
            <Text style={styles.forbiddenText}>✗ 侵犯他人知识产权、隐私权等合法权益</Text>
            <Text style={styles.forbiddenText}>✗ 传播垃圾信息、广告、病毒等</Text>
            <Text style={styles.forbiddenText}>✗ 恶意骚扰、辱骂、诽谤他人</Text>
            <Text style={styles.forbiddenText}>✗ 使用外挂、插件等非法手段</Text>
            <Text style={styles.forbiddenText}>✗ 盗用他人账号或冒充他人</Text>
            <Text style={styles.forbiddenText}>✗ 干扰或破坏服务的正常运行</Text>
          </View>

          {/* 4. 内容审核 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>四、内容审核</Text>
            <Text style={styles.sectionText}>
              4.1 您发布的动态内容需要经过审核才能公开显示。
            </Text>
            <Text style={styles.sectionText}>
              4.2 我们有权拒绝、删除或屏蔽任何违规内容。
            </Text>
            <Text style={styles.sectionText}>
              4.3 对于严重违规行为，我们有权暂停或终止您的账号。
            </Text>
          </View>

          {/* 5. 知识产权 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>五、知识产权</Text>
            <Text style={styles.sectionText}>
              5.1 本应用的所有内容（包括但不限于软件、文字、图片、logo等）的知识产权归我们所有。
            </Text>
            <Text style={styles.sectionText}>
              5.2 您发布的内容，您保留其知识产权，但授权我们在本应用范围内使用。
            </Text>
            <Text style={styles.sectionText}>
              5.3 未经授权，任何人不得复制、修改、传播本应用的任何内容。
            </Text>
          </View>

          {/* 6. 免责声明 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>六、免责声明</Text>
            <Text style={styles.sectionText}>
              6.1 本应用仅作为信息分享和社交平台，不对用户发布的内容负责。
            </Text>
            <Text style={styles.sectionText}>
              6.2 因不可抗力、网络故障等原因导致的服务中断，我们不承担责任。
            </Text>
            <Text style={styles.sectionText}>
              6.3 用户因使用本应用产生的任何纠纷，由用户自行解决。
            </Text>
          </View>

          {/* 7. 违约处理 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>七、违约处理</Text>
            <Text style={styles.sectionText}>
              如果您违反本协议的任何条款，我们有权采取以下措施：
            </Text>
            <Text style={styles.bulletText}>• 警告并要求改正</Text>
            <Text style={styles.bulletText}>• 删除违规内容</Text>
            <Text style={styles.bulletText}>• 限制部分功能使用</Text>
            <Text style={styles.bulletText}>• 暂停账号使用</Text>
            <Text style={styles.bulletText}>• 永久封禁账号</Text>
            <Text style={styles.bulletText}>• 追究法律责任</Text>
          </View>

          {/* 8. 法律适用与争议解决 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>八、法律适用与争议解决</Text>
            <Text style={styles.sectionText}>
              8.1 本协议的签订、履行、解释均适用中华人民共和国法律。
            </Text>
            <Text style={styles.sectionText}>
              8.2 如发生争议，双方应友好协商解决；协商不成的，
              任何一方可向本应用运营方所在地有管辖权的人民法院提起诉讼。
            </Text>
          </View>

          {/* 9. 其他条款 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>九、其他</Text>
            <Text style={styles.sectionText}>
              9.1 本协议自您注册成功之日起生效。
            </Text>
            <Text style={styles.sectionText}>
              9.2 本协议的任何条款无论因何种原因无效或不可执行，其余条款仍然有效。
            </Text>
            <Text style={styles.sectionText}>
              9.3 我们对本协议拥有最终解释权。
            </Text>
          </View>

          {/* 底部声明 */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>感谢您使用漂流瓶！</Text>
            <Text style={styles.footerText}>祝您使用愉快！🌊</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 5,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 28,
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerPlaceholder: {
    width: 50,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  updateDate: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  section: {
    marginBottom: 24,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  subTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#555',
    marginTop: 12,
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 24,
    marginBottom: 8,
  },
  bulletText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 24,
    marginBottom: 4,
    paddingLeft: 8,
  },
  forbiddenText: {
    fontSize: 14,
    color: '#FF3B30',
    lineHeight: 24,
    marginBottom: 6,
    paddingLeft: 8,
  },
  highlightText: {
    fontSize: 14,
    color: '#FF9500',
    lineHeight: 24,
    marginTop: 8,
    fontWeight: '500',
    backgroundColor: '#FFF3E0',
    padding: 10,
    borderRadius: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#007AFF',
    lineHeight: 28,
    marginBottom: 4,
  },
  footer: {
    marginTop: 20,
    marginBottom: 40,
    padding: 16,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  footerText: {
    fontSize: 13,
    color: '#1976D2',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 4,
  },
});

