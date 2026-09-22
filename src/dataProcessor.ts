/**
 * 数据处理模块
 */
import { 
  ProcessedSignResult, 
  SignResultItem, 
  SignResultSummary 
} from './types/dataProcessor.types';
import { SignResult } from './types/apiService.types';

/**
 * 处理签到结果数据
 * @param signResult - 签到结果
 * @returns 处理后的签到结果
 */
export function processSignResult(signResult: SignResult): ProcessedSignResult {
  // 解析签到结果
  if (!signResult) {
    return { success: false, message: '签到结果为空', info: {} };
  }
  
  // 处理不同的成功状态码
  if (signResult.no === 0 && signResult.data?.errmsg === 'success' && signResult.data?.errno === 0) {
    return { 
      success: true, 
      message: '签到成功', 
      info: {
        rank: signResult.data?.uinfo?.user_sign_rank,
        continueCount: signResult.data?.uinfo?.cont_sign_num 
      }
    };
  } else if (signResult.no === 1101) {
    return {
      success: true,
      message: '已经签到过了',
      info: {}
    };
  } else if (signResult.no === 2150040) {
    return {
      success: false,
      message: '签到失败，需要验证码',
      info: { code: signResult.no }
    };
  } else if (signResult.no === 1011) {
    return {
      success: false,
      message: '未加入此吧或等级不够',
      info: { code: signResult.no }
    };
  } else if (signResult.no === 1102) {
    return {
      success: false,
      message: '签到过快',
      info: { code: signResult.no }
    };
  } else if (signResult.no === 1010) {
    return {
      success: false,
      message: '目录出错',
      info: { code: signResult.no }
    };
  } else {
    return {
      success: false,
      message: signResult.error || `签到失败，错误码: ${signResult.no || '未知'}`,
      info: { 
        code: signResult.no ?? -1,
        data: signResult.data 
      }
    };
  }
}

/**
 * 汇总签到结果
 * @param results - 所有贴吧的签到结果
 * @returns 汇总结果
 */
export function summarizeResults(results: SignResultItem[]): SignResultSummary {
  if (!results || !Array.isArray(results)) {
    return {
      totalCount: 0,
      successCount: 0,
      alreadySignedCount: 0,
      failedCount: 0,
      signResults: {
        success: [],
        failed: []
      }
    };
  }
  
  const summary: SignResultSummary = {
    totalCount: results.length,
    successCount: 0,
    alreadySignedCount: 0,
    failedCount: 0,
    signResults: {
      success: [],
      failed: []
    }
  };
  
  // 统计各种错误类型的数量
  results.forEach(result => {
    if (result.success) {
      if (result.message === '已经签到过了') {
        summary.alreadySignedCount += 1;
        summary.signResults.success.push(result);
      } else {
        summary.successCount += 1;
        summary.signResults.success.push(result);
      }
    } else {
      summary.failedCount += 1;
      summary.signResults.failed.push(result);
    }
  });
  
  return summary;
}

/**
 * 格式化汇总结果为文本
 * @param summary - 汇总结果
 * @returns 格式化后的文本
 */
export function formatSummary(summary: SignResultSummary): string {
  let text = `📊 签到统计:\n`;
  text += `总计: ${summary.totalCount} 个贴吧\n`;
  text += `✅ 成功: ${summary.successCount} 个\n`;
  text += `📌 已签: ${summary.alreadySignedCount} 个\n`;
  text += `❌ 失败: ${summary.failedCount} 个`;
  
  // 添加失败原因统计
  if (summary.failedCount > 0) {
    // 整理失败原因
    const errorMessageCount: Record<string, number> = {};
    summary.signResults.failed.forEach(item => {
      if (!errorMessageCount[item.message]) {
        errorMessageCount[item.message] = 1;
      } else {
        errorMessageCount[item.message]++;
      }
    });
    
    text += `\n\n❌ 失败原因:\n`;
    for (const [errorMessage, count] of Object.entries(errorMessageCount)) {
      text += `- ${errorMessage}: ${count} 个\n`;
    }
  }
  
  return text;
} 