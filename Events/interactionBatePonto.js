const Discord = require("discord.js");
const client = require("../index");
const { QuickDB } = require("quick.db");
const db = new QuickDB();

client.on("interactionCreate", async (interaction) => {
  if (interaction.isButton()) {
    const userId = interaction.user.id;

    // === Abrir Ponto ===
    if (interaction.customId === "abrir_ponto") {
      const existingPonto = await db.get(`ponto_${userId}`);
      if (existingPonto && existingPonto.status === "aberto") {
        return interaction.reply({
          embeds: [
            new Discord.EmbedBuilder()
              .setDescription(
                "*** SISTEMA DE BATE PONTO - VOCÊ JÁ POSSUI UM PONTO ABERTO***\n\n> Você já possui um ponto aberto."
              )
              .setColor("#303136"),
          ],
          ephemeral: true,
        });
      }

      await db.set(`ponto_${userId}`, {
        status: "aberto",
        inicio: Date.now(),
        pausado: false,
        tempoPausado: 0,
        ultimaPausa: null,
      });

      return interaction.reply({
        embeds: [
          new Discord.EmbedBuilder()
            .setDescription(
              "*** SISTEMA DE BATE PONTO - PONTO INICIADO***\n\n> Ponto iniciado com sucesso!"
            )
            .setColor("#303136"),
        ],
        ephemeral: true,
      });
    }

    // === Pausar/Despausar Ponto ===
    if (interaction.customId === "pausar_ponto") {
      const ponto = await db.get(`ponto_${userId}`);
      if (!ponto || ponto.status !== "aberto") {
        return interaction.reply({
          embeds: [
            new Discord.EmbedBuilder()
              .setDescription(
                "*** SISTEMA DE BATE PONTO - NÃO HÁ PONTO ABERTO***\n\n> Você não possui um ponto aberto para pausar/despausar."
              )
              .setColor("#303136"),
          ],
          ephemeral: true,
        });
      }

      if (!ponto.pausado) {
        ponto.pausado = true;
        ponto.ultimaPausa = Date.now();
        await db.set(`ponto_${userId}`, ponto);

        return interaction.reply({
          embeds: [
            new Discord.EmbedBuilder()
              .setDescription(
                "*** SISTEMA DE BATE PONTO - PONTO PAUSADO***\n\n> Ponto pausado com sucesso!"
              )
              .setColor("#303136"),
          ],
          ephemeral: true,
        });
      } else {
        ponto.pausado = false;
        ponto.tempoPausado += Date.now() - ponto.ultimaPausa;
        ponto.ultimaPausa = null;
        await db.set(`ponto_${userId}`, ponto);

        return interaction.reply({
          embeds: [
            new Discord.EmbedBuilder()
              .setDescription(
                "*** SISTEMA DE BATE PONTO - PONTO RETOMADO***\n\n> Ponto retomado com sucesso!"
              )
              .setColor("#303136"),
          ],
          ephemeral: true,
        });
      }
    }

    // === Fechar Ponto ===
    if (interaction.customId === "fechar_ponto") {
      const ponto = await db.get(`ponto_${userId}`);
      if (!ponto || ponto.status !== "aberto") {
        return interaction.reply({
          embeds: [
            new Discord.EmbedBuilder()
              .setDescription(
                "*** SISTEMA DE BATE PONTO - NÃO HÁ PONTO ABERTO***\n\n> Você não possui um ponto aberto para fechar."
              )
              .setColor("#303136"),
          ],
          ephemeral: true,
        });
      }

      const agora = Date.now();
      const tempoTotal =
        agora - ponto.inicio - (ponto.pausado ? agora - ponto.ultimaPausa : ponto.tempoPausado);

      // Salvar o histórico do ponto
      const historico = (await db.get(`historico_ponto_${userId}`)) || [];
      historico.push({
        duracao: tempoTotal,
        fechadoEm: agora,
      });
      await db.set(`historico_ponto_${userId}`, historico);

      // Remover o ponto atual
      await db.delete(`ponto_${userId}`);

      const horas = Math.floor(tempoTotal / 3600000);
      const minutos = Math.floor((tempoTotal % 3600000) / 60000);
      const segundos = Math.floor((tempoTotal % 60000) / 1000);

      return interaction.reply({
        embeds: [
          new Discord.EmbedBuilder()
            .setDescription(
              `*** SISTEMA DE BATE PONTO - PONTO FECHADO***\n\n> Ponto fechado com sucesso! Duração total: **${horas}h ${minutos}m ${segundos}s**.`
            )
            .setColor("#303136"),
        ],
        ephemeral: true,
      });
    }

    // === Exibir Select Menu ===
    if (interaction.customId === "ver_opcoes") {
      const selectMenu = new Discord.ActionRowBuilder().addComponents(
        new Discord.StringSelectMenuBuilder()
          .setCustomId("menu_ver_opcoes")
          .setPlaceholder("Escolha uma opção")
          .addOptions([
            {
              label: "Ver Duração do Ponto",
              description: "Veja a duração atual do ponto aberto.",
              value: "ver_duracao_ponto",
            },
            {
              label: "Minha Carga Horária",
              description: "Veja sua carga horária total registrada.",
              value: "minha_carga_horaria",
            },
            {
              label: "Usuários com Ponto Aberto/Pausado (ADMIN)",
              description: "Veja o status dos usuários no momento.",
              value: "ver_status_usuarios",
            },
            {
              label: "Limpar Todas as Cargas Horárias (ADMIN)",
              description: "Remove todas as cargas horárias registradas.",
              value: "limpar_cargas_horarias",
            },
            {
              label: "Gerar Relatório (ADMIN)",
              description: "Gera um relatório com a carga horária de todos os membros.",
              value: "gerar_relatorio",
            },
          ])
      );

      return interaction.reply({
        content: "Selecione uma opção abaixo:",
        components: [selectMenu],
        ephemeral: true,
      });
    }
  }

  // === Tratamento do Select Menu ===
  if (interaction.isStringSelectMenu()) {
    const userId = interaction.user.id;

    if (interaction.customId === "menu_ver_opcoes") {
      const escolha = interaction.values[0];

      // Recriar o menu de seleção
      const selectMenu = new Discord.ActionRowBuilder().addComponents(
        new Discord.StringSelectMenuBuilder()
          .setCustomId("menu_ver_opcoes")
          .setPlaceholder("Escolha uma opção")
          .addOptions([
            {
              label: "Ver Duração do Ponto",
              description: "Veja a duração atual do ponto aberto.",
              value: "ver_duracao_ponto",
            },
            {
              label: "Minha Carga Horária",
              description: "Veja sua carga horária total registrada.",
              value: "minha_carga_horaria",
            },
            {
              label: "Usuários com Ponto Aberto/Pausado (ADMIN)",
              description: "Veja o status dos usuários no momento.",
              value: "ver_status_usuarios",
            },
            {
              label: "Limpar Todas as Cargas Horárias (ADMIN)",
              description: "Remove todas as cargas horárias registradas.",
              value: "limpar_cargas_horarias",
            },
            {
              label: "Gerar Relatório (ADMIN)",
              description: "Gera um relatório com a carga horária de todos os membros.",
              value: "gerar_relatorio",
            },
          ])
      );

      // === Ver Duração do Ponto ===
      if (escolha === "ver_duracao_ponto") {
        const ponto = await db.get(`ponto_${userId}`);
        if (!ponto || ponto.status !== "aberto") {
          return interaction.update({
            embeds: [
              new Discord.EmbedBuilder()
                .setDescription(
                  "*** SISTEMA DE BATE PONTO - NÃO HÁ PONTO ABERTO***\n\n> Você não possui um ponto aberto no momento."
                )
                .setColor("#303136"),
            ],
            components: [selectMenu],
          });
        }

        const agora = Date.now();
        const tempoAtual =
          agora - ponto.inicio - (ponto.pausado ? agora - ponto.ultimaPausa : ponto.tempoPausado);

        const horas = Math.floor(tempoAtual / 3600000);
        const minutos = Math.floor((tempoAtual % 3600000) / 60000);
        const segundos = Math.floor((tempoAtual % 60000) / 1000);

        return interaction.update({
          embeds: [
            new Discord.EmbedBuilder()
              .setDescription(
                `*** SISTEMA DE BATE PONTO - DURAÇÃO DO PONTO***\n\n> Duração atual do ponto: **${horas}h ${minutos}m ${segundos}s**.`
              )
              .setColor("#303136"),
          ],
          components: [selectMenu],
        });
      }

      // === Ver Minha Carga Horária ===
      if (escolha === "minha_carga_horaria") {
        const historico = (await db.get(`historico_ponto_${userId}`)) || [];
        if (historico.length === 0) {
          return interaction.update({
            embeds: [
              new Discord.EmbedBuilder()
                .setDescription(
                  "*** SISTEMA DE BATE PONTO - SEM REGISTROS***\n\n> Você não possui nenhuma carga horária registrada."
                )
                .setColor("#303136"),
            ],
            components: [selectMenu],
          });
        }

        const totalHoras = historico.reduce((acc, ponto) => acc + ponto.duracao, 0);
        const horas = Math.floor(totalHoras / 3600000);
        const minutos = Math.floor((totalHoras % 3600000) / 60000);
        const segundos = Math.floor((totalHoras % 60000) / 1000);

        return interaction.update({
          embeds: [
            new Discord.EmbedBuilder()
              .setDescription(
                `*** SISTEMA DE BATE PONTO - MINHA CARGA HORÁRIA***\n\n> Sua carga horária total registrada é: **${horas}h ${minutos}m ${segundos}s**.`
              )
              .setColor("#303136"),
          ],
          components: [selectMenu],
        });
      }

      // === Ver Status dos Usuários ===
      if (escolha === "ver_status_usuarios") {
        const cargoGerenciarId = await db.get("cargo_gerenciar_bateponto");
        if (!interaction.member.roles.cache.has(cargoGerenciarId)) {
          return interaction.update({
            embeds: [
              new Discord.EmbedBuilder()
                .setColor("#303136")
                .setDescription(
                  "***SISTEMA DE BATE PONTO - PERMISSÃO NEGADA***\n\n> Você não possui permissão para visualizar o status dos usuários."
                ),
            ],
            components: [selectMenu],
          });
        }

        const allKeys = await db.all();
        const usuariosAbertos = [];
        const usuariosPausados = [];

        for (const entry of allKeys) {
          if (entry.id.startsWith("ponto_")) {
            const userId = entry.id.split("_")[1];
            const ponto = entry.value;

            const user = await client.users.fetch(userId).catch(() => null);
            if (user) {
              if (ponto.status === "aberto" && ponto.pausado) {
                usuariosPausados.push(`<@${user.id}> (${user.id})`);
              } else if (ponto.status === "aberto") {
                usuariosAbertos.push(`<@${user.id}> (${user.id})`);
              }
            }
          }
        }

        const embed = new Discord.EmbedBuilder()
          .setTitle("***SISTEMA DE BATE PONTO - STATUS DOS USUÁRIOS***")
          .setColor("#303136")
          .setDescription(
            `> **Usuários com ponto aberto:**\n${usuariosAbertos.join("\n") || "Nenhum"}\n\n` +
            `> **Usuários com ponto pausado:**\n${usuariosPausados.join("\n") || "Nenhum"}`
          );

        return interaction.update({
          embeds: [embed],
          components: [selectMenu],
        });
      }

      // === Limpar Todas as Cargas Horárias ===
      if (escolha === "limpar_cargas_horarias") {
        const cargoGerenciarId = await db.get("cargo_gerenciar_bateponto");
        if (!interaction.member.roles.cache.has(cargoGerenciarId)) {
          return interaction.update({
            embeds: [
              new Discord.EmbedBuilder()
                .setColor("#303136")
                .setDescription(
                  "***SISTEMA DE BATE PONTO - PERMISSÃO NEGADA***\n\n> Você não possui permissão para limpar as cargas horárias."
                ),
            ],
            components: [selectMenu],
          });
        }

        const allKeys = await db.all();
        for (const entry of allKeys) {
          if (entry.id.startsWith("ponto_") || entry.id.startsWith("historico_ponto_")) {
            await db.delete(entry.id);
          }
        }

        return interaction.update({
          embeds: [
            new Discord.EmbedBuilder()
              .setColor("#303136")
              .setDescription(
                "***SISTEMA DE BATE PONTO - CARGAS HORÁRIAS LIMPAS***\n\n> Todas as cargas horárias e pontos abertos foram removidos com sucesso."
              ),
          ],
          components: [selectMenu],
        });
      }

      // === Gerar Relatório ===  
    
      if (escolha === "gerar_relatorio") {
  const cargoGerenciarId = await db.get("cargo_gerenciar_bateponto");
  if (!interaction.member.roles.cache.has(cargoGerenciarId)) {
    return interaction.reply({
      embeds: [
        new Discord.EmbedBuilder()
          .setColor("#303136")
          .setDescription(
            "***SISTEMA DE BATE PONTO - PERMISSÃO NEGADA***\n\n> Você não possui permissão para gerar o relatório."
          ),
      ],
      ephemeral: true,
    });
  }

  const allKeys = await db.all();
  const relatorio = [];

  for (const entry of allKeys) {
    if (entry.id.startsWith("historico_ponto_")) {
      const userId = entry.id.split("_")[2];
      const historico = entry.value;

      const user = await client.users.fetch(userId).catch(() => null);
      if (user) {
        const totalHoras = historico.reduce((acc, ponto) => acc + ponto.duracao, 0);
        relatorio.push({
          username: user.username,
          userId: user.id,
          totalHoras,
        });
      }
    }
  }

  // Ordena o relatório em ordem decrescente de horas
  relatorio.sort((a, b) => b.totalHoras - a.totalHoras);

  // Formata o relatório
  const relatorioFormatado = relatorio.map((item, index) => {
    const horas = Math.floor(item.totalHoras / 3600000);
    const minutos = Math.floor((item.totalHoras % 3600000) / 60000);
    const segundos = Math.floor((item.totalHoras % 60000) / 1000);

    return `> **${index + 1}. <@${item.userId}> (${item.userId})** ${horas}h ${minutos}m ${segundos}s\n\n`;
  });

  const embed = new Discord.EmbedBuilder()
    .setTitle("***SISTEMA DE BATE PONTO - RELATÓRIO DE CARGA HORÁRIA***")
    .setColor("#303136")
    .setDescription(
      relatorioFormatado.length > 0
        ? relatorioFormatado.join("\n")
        : "Nenhum membro possui carga horária registrada no momento."
    );

  return interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
}

    }
  }
});