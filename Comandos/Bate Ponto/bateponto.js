const Discord = require("discord.js");
const { QuickDB } = require("quick.db");
const db = new QuickDB();

module.exports = {
  name: "bateponto",
  description: "Configura o sistema de bate-ponto.",
  type: Discord.ApplicationCommandType.ChatInput,
  options: [
    {
      name: "painel",
      description: "Configura o canal onde será enviado o painel de bate-ponto.",
      type: Discord.ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "canal",
          description: "Canal onde o painel será enviado.",
          type: Discord.ApplicationCommandOptionType.Channel,
          required: true,
        },
        {
          name: "cargo",
          description: "Cargo necessário para gerenciar o painel.",
          type: Discord.ApplicationCommandOptionType.Role,
          required: true,
        },
      ],
    },
  ],

  run: async (client, interaction) => {
if (
  !interaction.guild ||
  !interaction.member ||
  !interaction.member.permissions.has(Discord.PermissionFlagsBits.Administrator)
) {
  return interaction.reply({
    content: "❌ Você não tem permissão para usar este comando.",
    ephemeral: true,
  });
}

    const subcommand = interaction.options.getSubcommand();

    // Configurar o painel de bate-ponto
    if (subcommand === "painel") {
      const canal = interaction.options.getChannel("canal");
      const cargo = interaction.options.getRole("cargo");

      if (canal.type !== Discord.ChannelType.GuildText) {
        return interaction.reply({
          content: "❌ O canal selecionado não é um canal de texto.",
          ephemeral: true,
        });
      }

      await db.set("canal_painel_bateponto", canal.id);
      await db.set("cargo_gerenciar_bateponto", cargo.id);

      const embed = new Discord.EmbedBuilder()
        .setColor("#303136")
        .setTitle("***SISTEMA DE BATE-PONTO***")
        .setDescription(
          `> Utilize os botões abaixo para gerenciar seu ponto:\n\n` +
          `- **Abrir Ponto**: Inicia o registro do ponto.\n` +
          `- **Pausar/Despausar**: Pausa ou retoma o registro do ponto.\n` +
          `- **Fechar Ponto**: Finaliza o registro do ponto e calcula a duração.\n` +
          `- **Ver Opções**: Escolha entre ver a duração do ponto ou o status dos usuários.`
        );

      const botoes = new Discord.ActionRowBuilder().addComponents(
        new Discord.ButtonBuilder()
          .setCustomId("abrir_ponto")
          .setLabel("Abrir Ponto")
          .setStyle(Discord.ButtonStyle.Success),

        new Discord.ButtonBuilder()
          .setCustomId("fechar_ponto")
          .setLabel("Fechar Ponto")
          .setStyle(Discord.ButtonStyle.Danger),

        new Discord.ButtonBuilder()
          .setCustomId("pausar_ponto")
          .setLabel("Pausar/Despausar")
          .setStyle(Discord.ButtonStyle.Primary),

        new Discord.ButtonBuilder()
          .setCustomId("ver_opcoes")
          .setLabel("Ver Opções")
          .setStyle(Discord.ButtonStyle.Secondary)
      );

      await canal.send({
        embeds: [embed],
        components: [botoes],
      });

      return interaction.reply({
        content: `✅ Painel de bate-ponto configurado com sucesso no canal ${canal} e o cargo ${cargo} foi definido para gerenciar o painel.`,
        ephemeral: true,
      });
    }
  },
};