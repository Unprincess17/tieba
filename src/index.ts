// 百度贴吧自动签到 GitHub Action 脚本
import { login, getTiebaList, signTieba, getTbs } from './apiService';
import { processSignResult, summarizeResults, formatSummary } from './dataProcessor';
import { formatDate, maskTiebaName } from './utils';
import { sendNotification } from './notify';
import { SignResultItem } from './types/dataProcessor.types';
import { TiebaInfo } from './types/apiService.types';

// 定义贴吧签到跟踪信息接口
interface TiebaTrackInfo {
  tieba: TiebaInfo;
  tiebaName: string;
  tiebaIndex: number;
}

// 执行主函数 - 使用立即执行的异步函数表达式
(async () => {
  const startTime = Date.now();
  try {
    console.log('==========================================');
    console.log('🏆 开始执行 百度贴吧自动签到 脚本...');
    console.log('==========================================');
    
    // 获取当前时间
    const now = new Date();
    
    // 标准时间和北京时间
    console.log(`📅 标准时间: ${formatDate(now, 'UTC', '+0')}`);
    console.log(`📅 北京时间: ${formatDate(now, 'Asia/Shanghai', '+8')}`);
    
    // 检查必要的环境变量
    if (!process.env.BDUSS) {
      throw new Error('缺少必要的环境变量: BDUSS');
    }
    
    const bduss = process.env.BDUSS;
    
    // 1. 验证登录凭证
    console.log('▶️ 步骤1: 验证登录凭证...');
    const userInfo = await login(bduss);
    console.log(`🔑 登录凭证验证结果: ${JSON.stringify({
      status: userInfo.status,
      userId: userInfo.userId ? String(userInfo.userId).substring(0, 3) + '***' : undefined,
      isValid: userInfo.isValid
    })}`);
    if (userInfo.status === 200) {
      console.log('✅ 验证BDUSS成功');
    } else {
      throw new Error('验证BDUSS失败，请检查BDUSS是否有效');
    }

    // 2. 获取贴吧列表和TBS
    console.log('▶️ 步骤2: 获取贴吧列表和TBS...');
    const tiebaList = await getTiebaList(bduss);
    
    if (tiebaList.length === 0) {
      console.log('⚠️ 未找到关注的贴吧，可能是登录失效或没有关注贴吧');
    } else {
      console.log(`📋 共找到 ${tiebaList.length} 个关注的贴吧`);
    }
    
    // 3. 执行签到过程
    console.log('▶️ 步骤3: 开始签到过程...');
    
    // 获取TBS
    const tbs = await getTbs(bduss);
    
    // 配置批量签到的大小和间隔
    const batchSize = parseInt(process.env.BATCH_SIZE || '5', 10);
    const batchInterval = parseInt(process.env.BATCH_INTERVAL || '1000', 10);
    
    // 配置重试相关参数
    const maxRetries = parseInt(process.env.MAX_RETRIES || '3', 10); // 最大重试次数，默认3次
    const retryInterval = parseInt(process.env.RETRY_INTERVAL || '5000', 10); // 重试间隔，默认5秒
    
    // 按批次处理签到
    const signResults: SignResultItem[] = [];
    let alreadySignedCount = 0;
    let successCount = 0;
    let failedCount = 0;
    
    // 开始批量处理
    console.log(`📊 开始批量处理签到，每批 ${batchSize} 个，间隔 ${batchInterval}ms`);
    
    for (let i = 0; i < tiebaList.length; i += batchSize) {
      const batchTiebas = tiebaList.slice(i, i + batchSize);
      const batchPromises: Promise<SignResultItem>[] = [];
      
      const currentBatch = Math.floor(i/batchSize) + 1;
      const totalBatches = Math.ceil(tiebaList.length/batchSize);
      console.log(`📌 批次 ${currentBatch}/${totalBatches}: 处理 ${batchTiebas.length} 个贴吧`);
      
      // 记录本批次中需要签到的贴吧
      const needSignTiebas: TiebaTrackInfo[] = [];
      
      for (let j = 0; j < batchTiebas.length; j++) {
        const tieba = batchTiebas[j];
        const tiebaName = tieba.forum_name;
        const tiebaIndex = i + j + 1; // 全局索引，仅用于结果存储
        
        // 已签到的贴吧跳过
        if (tieba.is_sign === 1) {
          alreadySignedCount++;
          signResults.push({
            success: true,
            message: '已经签到过了',
            name: tiebaName,
            index: tiebaIndex,
            info: {}
          });
          continue;
        }
        
        // 需要签到的贴吧
        needSignTiebas.push({
          tieba,
          tiebaName,
          tiebaIndex
        });
        
        // 添加签到任务
        const signPromise = (async () => {
          try {
            const result = await signTieba(bduss, tiebaName, tbs, tiebaIndex);
            const processedResult = processSignResult(result);
            
            // 更新计数
            if (processedResult.success) {
              if (processedResult.message === '已经签到过了') {
                alreadySignedCount++;
              } else {
                successCount++;
              }
            } else {
              failedCount++;
            }
            
            return { 
              ...processedResult, 
              name: tiebaName,
              index: tiebaIndex
            };
          } catch (error) {
            failedCount++;
            return {
              success: false,
              message: (error as Error).message,
              name: tiebaName,
              index: tiebaIndex,
              info: {}
            };
          }
        })();
        
        batchPromises.push(signPromise);
      }
      
      // 等待当前批次的签到任务完成
      const batchResults = await Promise.all(batchPromises);
      
      // 收集签到失败的贴吧
      const failedTiebas: TiebaTrackInfo[] = [];
      batchResults.forEach(result => {
        if (!result.success) {
          // 找到该贴吧的原始信息
          const failedTieba = needSignTiebas.find(t => t.tiebaName === result.name);
          if (failedTieba) {
            failedTiebas.push(failedTieba);
          }
        }
      });
      
      // 将当前批次结果添加到总结果中
      signResults.push(...batchResults);
      
      // 每批次后输出简洁的进度统计
      console.log(`✅ 批次${currentBatch}完成: ${i + batchTiebas.length}/${tiebaList.length} | ` +
                 `成功: ${successCount} | 已签: ${alreadySignedCount} | 失败: ${failedCount}`);
      
      // 如果有失败的贴吧，进行重试
      if (failedTiebas.length > 0) {
        // 进行多次重试
        for (let retryCount = 1; retryCount <= maxRetries; retryCount++) {
          if (failedTiebas.length === 0) break; // 如果没有失败的贴吧了，就退出重试循环
          
          console.log(`🔄 第${retryCount}/${maxRetries}次重试: 检测到 ${failedTiebas.length} 个贴吧签到失败，等待 ${retryInterval/1000} 秒后重试...`);
          await new Promise(resolve => setTimeout(resolve, retryInterval));
          
          console.log(`🔄 开始第${retryCount}次重试签到失败的贴吧...`);
          const retryPromises: Promise<{ success: boolean, tiebaName: string }>[] = [];
          const stillFailedTiebas: TiebaTrackInfo[] = []; // 保存本次重试后仍然失败的贴吧
          
          // 对失败的贴吧重新签到
          for (const failedTieba of failedTiebas) {
            const { tieba, tiebaName, tiebaIndex } = failedTieba;
            
            const retryPromise = (async () => {
              try {
                console.log(`🔄 第${retryCount}次重试签到: ${maskTiebaName(tiebaName)}`);
                const result = await signTieba(bduss, tiebaName, tbs, tiebaIndex);
                const processedResult = processSignResult(result);
                
                // 更新计数和结果
                if (processedResult.success) {
                  // 找到之前失败的结果并移除
                  const failedResultIndex = signResults.findIndex(
                    r => r.name === tiebaName && !r.success
                  );
                  if (failedResultIndex !== -1) {
                    signResults.splice(failedResultIndex, 1);
                  }
                  
                  // 添加成功的结果
                  signResults.push({
                    ...processedResult,
                    name: tiebaName,
                    index: tiebaIndex,
                    retried: true,
                    retryCount: retryCount
                  });
                  
                  // 更新计数
                  failedCount--;
                  if (processedResult.message === '已经签到过了') {
                    alreadySignedCount++;
                  } else {
                    successCount++;
                  }
                  
                  console.log(`✅ ${maskTiebaName(tiebaName)} 第${retryCount}次重试签到成功`);
                  return { success: true, tiebaName };
                } else {
                  console.log(`❌ ${maskTiebaName(tiebaName)} 第${retryCount}次重试签到仍然失败: ${processedResult.message}`);
                  // 将此贴吧保存到仍然失败的列表中，准备下一次重试
                  stillFailedTiebas.push(failedTieba);
                  return { success: false, tiebaName };
                }
              } catch (error) {
                console.log(`❌ ${maskTiebaName(tiebaName)} 第${retryCount}次重试签到出错: ${(error as Error).message}`);
                // 将此贴吧保存到仍然失败的列表中，准备下一次重试
                stillFailedTiebas.push(failedTieba);
                return { success: false, tiebaName };
              }
            })();
            
            retryPromises.push(retryPromise);
          }
          
          // 等待所有重试完成
          await Promise.all(retryPromises);
          
          // 更新失败的贴吧列表，用于下一次重试
          failedTiebas.length = 0;
          failedTiebas.push(...stillFailedTiebas);
          
          // 重试后统计
          console.log(`🔄 第${retryCount}次重试完成，当前统计: 成功: ${successCount} | 已签: ${alreadySignedCount} | 失败: ${failedCount}`);
          
          // 如果所有贴吧都已成功签到，提前结束重试
          if (failedTiebas.length === 0) {
            console.log(`🎉 所有贴吧签到成功，不需要继续重试`);
            break;
          }
          
          // 如果不是最后一次重试，并且还有失败的贴吧，则短暂暂停
          if (retryCount < maxRetries && failedTiebas.length > 0) {
            console.log(`⏳ 准备第${retryCount+1}次重试...`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // 短暂暂停以便于查看日志
          }
        }
        
        // 最终重试结果
        if (failedTiebas.length > 0) {
          console.log(`⚠️ 经过 ${maxRetries} 次重试后，仍有 ${failedTiebas.length} 个贴吧签到失败`);
        } else {
          console.log(`🎉 重试成功！所有贴吧都已成功签到`);
        }
      }
      
      // 在批次之间添加延迟，除非是最后一批
      if (i + batchSize < tiebaList.length) {
        console.log(`⏳ 等待 ${batchInterval/1000} 秒后处理下一批...`);
        await new Promise(resolve => setTimeout(resolve, batchInterval));
      }
    }
    
    // 4. 汇总结果
    console.log('▶️ 步骤4: 汇总签到结果');
    const summary = summarizeResults(signResults);
    const summaryText = formatSummary(summary);
    
    // 完成
    console.log('==========================================');
    console.log(summaryText);
    console.log('==========================================');
    
    // 5. 发送通知 - 只有在有贴吧签到失败时才发送
    const shouldNotify = process.env.ENABLE_NOTIFY === 'true' && failedCount > 0;
    
    if (shouldNotify) {
      console.log('▶️ 步骤5: 发送通知 (由于签到失败而触发)');
      await sendNotification(summaryText);
    } else if (process.env.ENABLE_NOTIFY === 'true') {
      console.log('ℹ️ 签到全部成功，跳过通知发送');
    } else {
      console.log('ℹ️ 通知功能未启用，跳过通知发送');
    }
    
  } catch (error) {
    console.error('==========================================');
    console.error(`❌ 错误: ${(error as Error).message}`);
    if ((error as any).response) {
      console.error('📡 服务器响应:');
      console.error(`状态码: ${(error as any).response.status}`);
      console.error(`数据: ${JSON.stringify((error as any).response.data)}`);
    }
    console.error('==========================================');
    
    // 发送错误通知 - BDUSS失效时一定要通知
    const errMsg = (error as Error).message;
    const isBdussError = errMsg.includes('BDUSS') || errMsg.includes('登录');
    const shouldNotify = process.env.ENABLE_NOTIFY === 'true' || isBdussError;
    
    if (shouldNotify) {
      try {
        console.log('▶️ 步骤5: 发送通知 (由于BDUSS失效或严重错误触发)');
        await sendNotification(`❌ 签到脚本执行失败!\n\n错误信息: ${(error as Error).message}`);
      } catch (e) {
        console.error(`❌ 发送错误通知失败: ${(e as Error).message}`);
      }
    }
    
    process.exit(1); // 失败时退出程序，退出码为1
  } finally {
    // 无论成功还是失败都会执行的代码
    const endTime = Date.now();
    const executionTime = (endTime - startTime) / 1000;
    console.log(`⏱️ 总执行时间: ${executionTime.toFixed(2)}秒`);
    console.log('==========================================');
  }
})(); 