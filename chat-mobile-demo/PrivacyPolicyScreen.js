import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';

export default function PrivacyPolicyScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      {/* 头部导航 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>‹ 返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>隐私政策</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* 更新日期 */}
          <Text style={styles.updateDate}>最后更新日期：2025年10月26日</Text>

          {/* 引言 */}
          <View style={styles.section}>
            <Text style={styles.sectionText}>
              欢迎使用漂流瓶应用（以下简称"本应用"或"我们"）。我们非常重视您的隐私保护和个人信息安全。
              本隐私政策将帮助您了解我们如何收集、使用、存储和保护您的个人信息。
            </Text>
            <Text style={styles.sectionText}>
              请您在使用本应用前，仔细阅读并充分理解本隐私政策。如果您不同意本隐私政策的任何内容，
              请您立即停止使用我们的服务。
            </Text>
          </View>

          {/* 1. 我们收集的信息 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>一、我们收集的信息</Text>
            
            <Text style={styles.subTitle}>1.1 您主动提供的信息</Text>
            <Text style={styles.sectionText}>• 注册信息：手机号码、用户名、性别（一旦设置不可更改）</Text>
            <Text style={styles.sectionText}>• 个人资料：昵称、头像、个性签名</Text>
            <Text style={styles.sectionText}>• 用户内容：您发布的动态、评论、私信、漂流瓶内容</Text>
            <Text style={styles.sectionText}>• 多媒体文件：您上传的图片、语音消息</Text>
            
            <Text style={styles.subTitle}>1.2 我们自动收集的信息</Text>
            <Text style={styles.sectionText}>• 设备信息：设备型号、操作系统版本、设备标识符</Text>
            <Text style={styles.sectionText}>• 日志信息：IP地址、访问时间、操作记录</Text>
            <Text style={styles.sectionText}>• 位置信息：仅在您使用漂流瓶功能时收集（需要您的授权）</Text>
            <Text style={styles.sectionText}>• 使用数据：功能使用情况、签到记录、积分信息</Text>
          </View>

          {/* 2. 信息的使用 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>二、信息的使用</Text>
            <Text style={styles.sectionText}>我们会将收集的信息用于以下目的：</Text>
            <Text style={styles.sectionText}>• 提供、维护和改进我们的服务</Text>
            <Text style={styles.sectionText}>• 处理您的注册、登录和账户管理</Text>
            <Text style={styles.sectionText}>• 实现用户间的社交互动功能</Text>
            <Text style={styles.sectionText}>• 发送系统通知和服务更新</Text>
            <Text style={styles.sectionText}>• 保护账户安全，防止欺诈和滥用</Text>
            <Text style={styles.sectionText}>• 遵守法律法规要求</Text>
            <Text style={styles.sectionText}>• 数据分析和服务优化</Text>
          </View>

          {/* 3. 信息的存储 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>三、信息的存储</Text>
            <Text style={styles.sectionText}>• 存储地点：您的个人信息将存储在中国境内的服务器</Text>
            <Text style={styles.sectionText}>• 存储期限：在您使用服务期间及服务终止后的必要期限内</Text>
            <Text style={styles.sectionText}>• 账号注销：您可申请注销账号，注销后数据将在7天后删除</Text>
            <Text style={styles.sectionText}>• 数据备份：我们会定期备份数据以防止数据丢失</Text>
          </View>

          {/* 4. 信息的共享 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>四、信息的共享、转让和公开披露</Text>
            
            <Text style={styles.subTitle}>4.1 共享</Text>
            <Text style={styles.sectionText}>我们不会与第三方共享您的个人信息，除非：</Text>
            <Text style={styles.sectionText}>• 获得您的明确同意</Text>
            <Text style={styles.sectionText}>• 法律法规要求</Text>
            <Text style={styles.sectionText}>• 与关联公司共享（如有）</Text>
            <Text style={styles.sectionText}>• 与授权合作伙伴共享（仅限提供服务所需）</Text>
            
            <Text style={styles.subTitle}>4.2 公开内容</Text>
            <Text style={styles.sectionText}>• 您发布的公开动态将对所有用户可见</Text>
            <Text style={styles.sectionText}>• 您的用户名、头像、个性签名等公开资料可被其他用户查看</Text>
            <Text style={styles.sectionText}>• 漂流瓶内容会被随机推送给其他用户</Text>
          </View>

          {/* 5. 信息安全 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>五、信息安全</Text>
            <Text style={styles.sectionText}>我们采取以下措施保护您的信息安全：</Text>
            <Text style={styles.sectionText}>• 使用SSL/TLS加密传输数据</Text>
            <Text style={styles.sectionText}>• 对敏感信息进行加密存储</Text>
            <Text style={styles.sectionText}>• 实施访问控制和权限管理</Text>
            <Text style={styles.sectionText}>• 定期进行安全评估和漏洞扫描</Text>
            <Text style={styles.sectionText}>• 建立数据泄露应急响应机制</Text>
          </View>

          {/* 6. 您的权利 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>六、您的权利</Text>
            <Text style={styles.sectionText}>您对自己的个人信息享有以下权利：</Text>
            <Text style={styles.sectionText}>• 访问权：查看我们持有的您的个人信息</Text>
            <Text style={styles.sectionText}>• 更正权：更正不准确或不完整的信息</Text>
            <Text style={styles.sectionText}>• 删除权：要求删除您的个人信息</Text>
            <Text style={styles.sectionText}>• 撤回权：撤回您之前给予的授权同意</Text>
            <Text style={styles.sectionText}>• 注销权：申请注销账号并删除相关数据</Text>
            <Text style={styles.highlightText}>
              ⚠️ 注意：性别信息一旦设置将无法修改，请谨慎选择
            </Text>
          </View>

          {/* 7. 未成年人保护 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>七、未成年人保护</Text>
            <Text style={styles.sectionText}>
              我们非常重视未成年人的个人信息保护。如果您是未成年人，请在监护人的陪同下阅读本政策，
              并在监护人同意的前提下使用我们的服务。
            </Text>
            <Text style={styles.sectionText}>
              如果您是未成年人的监护人，当您对您所监护的未成年人的个人信息有相关疑问时，
              请通过本政策公示的联系方式与我们联系。
            </Text>
          </View>

          {/* 8. 第三方服务 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>八、第三方服务</Text>
            <Text style={styles.sectionText}>本应用可能使用以下第三方服务：</Text>
            <Text style={styles.sectionText}>• 阿里云OSS：用于存储图片、语音等文件</Text>
            <Text style={styles.sectionText}>• 短信服务：用于发送验证码</Text>
            <Text style={styles.sectionText}>• 推送服务：用于发送消息通知</Text>
            <Text style={styles.sectionText}>
              这些第三方服务提供商会根据其自身的隐私政策处理您的信息。
              我们建议您查阅这些第三方的隐私政策。
            </Text>
          </View>

          {/* 9. Cookie和类似技术 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>九、Cookie和类似技术</Text>
            <Text style={styles.sectionText}>
              我们使用本地存储技术（如AsyncStorage）来保存您的登录状态、用户偏好等信息。
              这些技术帮助我们提供更好的用户体验。
            </Text>
          </View>

          {/* 10. 隐私政策的更新 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>十、隐私政策的更新</Text>
            <Text style={styles.sectionText}>
              我们可能会不时更新本隐私政策。更新后的政策将在应用内公布，并在您继续使用服务时生效。
              重大变更时，我们会通过应用内通知或其他方式告知您。
            </Text>
          </View>

          {/* 11. 联系我们 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>十一、如何联系我们</Text>
            <Text style={styles.sectionText}>
              如果您对本隐私政策有任何疑问、意见或建议，请通过以下方式联系我们：
            </Text>
            <Text style={styles.contactText}>📧 邮箱：privacy@driftbottle.com</Text>
            <Text style={styles.contactText}>📱 客服热线：400-XXX-XXXX</Text>
            <Text style={styles.contactText}>📍 地址：[公司地址]</Text>
            <Text style={styles.sectionText}>
              我们将在15个工作日内回复您的请求。
            </Text>
          </View>

          {/* 底部声明 */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              本隐私政策是《漂流瓶用户协议》的重要组成部分。
            </Text>
            <Text style={styles.footerText}>
              使用本应用即表示您已阅读并同意本隐私政策。
            </Text>
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
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  footerText: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 4,
  },
});

