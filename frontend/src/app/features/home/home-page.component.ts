import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { VehiclesApiService } from '../../core/services/vehicles-api.service';
import { SearchHeaderComponent } from '../../shared/components/search-header.component';
import { VehicleCardComponent } from '../../shared/components/vehicle-card.component';
import { VehicleCardItem } from '../../core/models/domain.models';

type BrandShortcut = {
  label: string;
  query: string;
  iconPath?: string;
  iconKind?: 'path' | 'volkswagen' | 'byd';
  iconViewBox?: string;
  iconWide?: boolean;
};

const POPULAR_BRANDS: BrandShortcut[] = [
  {
    label: 'Chevrolet',
    query: 'Chevrolet',
    iconPath:
      'M20.65 9.77h-4.53L14.8 7H9.2L7.88 9.77H3.35L2 12.5l1.35 2.73h4.53L9.2 18h5.6l1.32-2.77h4.53L22 12.5l-1.35-2.73zm-5.71 4.13-1.32 2.77h-3.24L9.06 13.9H4.21l-.66-1.4.66-1.4h4.85l1.32-2.77h3.24l1.32 2.77h4.85l.66 1.4-.66 1.4h-4.85z',
  },
  {
    label: 'BMW',
    query: 'BMW',
    iconPath:
      'M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 .78C18.196.78 23.219 5.803 23.219 12c0 6.196-5.022 11.219-11.219 11.219C5.803 23.219.781 18.196.781 12S5.804.78 12 .78zm-.678.63c-.33.014-.66.042-.992.078l-.107 2.944a9.95 9.95 0 0 1 .71-.094l.07-1.988-.013-.137.043.13.664 1.489h.606l.664-1.488.04-.131-.01.137.07 1.988c.232.022.473.054.71.094l-.109-2.944a14.746 14.746 0 0 0-.992-.078l-.653 1.625-.023.12-.023-.12-.655-1.625zm6.696 1.824l-1.543 2.428c.195.15.452.371.617.522l1.453-.754.092-.069-.069.094-.752 1.453c.163.175.398.458.53.63l2.43-1.544a16.135 16.135 0 0 0-.46-.568L18.777 6.44l-.105.092.078-.115.68-1.356-.48-.48-1.356.68-.115.078.091-.106 1.018-1.539c-.18-.152-.351-.291-.57-.46zM5.5 3.785c-.36.037-.638.283-1.393 1.125a18.97 18.97 0 0 0-.757.914l2.074 1.967c.687-.76.966-1.042 1.508-1.613.383-.405.6-.87.216-1.317-.208-.242-.558-.295-.85-.175l-.028.01.01-.026a.7.7 0 0 0-.243-.734.724.724 0 0 0-.537-.15zm.006.615c.136-.037.277.06.308.2.032.14-.056.272-.154.382-.22.25-1.031 1.098-1.031 1.098l-.402-.383c.417-.51.861-.974 1.062-1.158a.55.55 0 0 1 .217-.139zM12 4.883a7.114 7.114 0 0 0-7.08 6.388v.002a7.122 7.122 0 0 0 8.516 7.697 7.112 7.112 0 0 0 5.68-6.97A7.122 7.122 0 0 0 12 4.885v-.002zm-5.537.242c.047 0 .096.013.14.043.088.059.128.16.106.26-.026.119-.125.231-.205.318l-1.045 1.12-.42-.4s.787-.832 1.045-1.099c.102-.106.168-.17.238-.205a.331.331 0 0 1 .14-.037zM12 5.818A6.175 6.175 0 0 1 18.182 12H12v6.182A6.175 6.175 0 0 1 5.818 12H12V5.818Z',
  },
  {
    label: 'Jeep',
    query: 'Jeep',
    iconPath:
      'M4.1651 7.1687v5.2011c0 .6762-.444 1.0777-1.1628 1.0777-.7185 0-1.0992-.5283-1.0992-1.0992v-.9299H0v.9514c0 .972.296 2.7068 3.0235 2.7068 2.7272 0 3.1082-1.8614 3.1082-2.7488V7.1687Zm4.9177 2.1562c-1.7973 0-2.6003 1.6485-2.6003 3.0657 0 1.4168.9094 2.7912 2.7695 2.7912 1.6285.021 2.707-1.0361 2.707-1.8187h-1.7977s-.2113.5078-.8458.5078c-.6343 0-.9934-.3596-.9934-1.2265h3.6576c0-2.7277-1.3526-3.3195-2.897-3.3195zm5.8471 0c-1.7968 0-2.6007 1.6485-2.6007 3.0657 0 1.4168.9094 2.7912 2.7705 2.7912 1.628.021 2.7067-1.0361 2.7067-1.8187h-1.7978s-.2116.5078-.8454.5078c-.6348 0-.9942-.3596-.9942-1.2265h3.6574c0-2.7277-1.3523-3.3195-2.8965-3.3195zm6.7435.0635c-.9132 0-1.3186.4962-1.3401.522-.1283.1538-.2875.3165-.2875-.0782v-.2959h-1.8193v7.295h1.8398V14.822c0-.148.1478-.126.2543 0 .1063.1277.5711.4443 1.3752.4443C23.155 15.2663 24 13.9978 24 12.264c0-2.2415-1.4162-2.8757-2.3266-2.8756Zm-12.401 1.1203c.6766 0 .972.5073.972 1.0365H8.3843c0-.5718.2327-1.0365.8882-1.0365zm5.8468 0c.6767 0 .9724.5073.9724 1.0365H14.231c0-.5718.2332-1.0365.8883-1.0365zm5.9204.296c.9318 0 1.1.7189 1.1 1.4593 0 .74-.1272 1.7124-1.0141 1.7124-.8884 0-1.1212-.5709-1.1017-1.6486.022-1.0788.4441-1.523 1.0158-1.523zm2.2813 4.5664a.5855.5855 0 0 0-.5856.5857c0 .3233.2617.5856.5856.5856.3218 0 .585-.2623.585-.5856 0-.3233-.2632-.5857-.585-.5857zm0 .062a.524.524 0 0 1 .5236.5237c0 .2884-.2346.5246-.5236.5246a.5258.5258 0 0 1-.525-.5246c0-.289.2352-.5236.525-.5236zm-.2108.2024v.6208h.0725v-.2689h.1764l.1159.269h.0806l-.1216-.2873c.0386-.0133.0514-.0227.072-.0447.0266-.0287.0434-.0739.0434-.115 0-.1034-.0796-.174-.195-.174zm.0705.0676h.1722c.072 0 .1177.041.1177.1045 0 .072-.0485.1168-.1278.1168h-.1621z',
  },
  {
    label: 'Fiat',
    query: 'Fiat',
    iconPath:
      'M21.175 6.25c.489 1.148.726 2.442.726 3.956 0 .818-.068 1.69-.206 2.666-.286 2.01-1.048 4.11-1.75 5.494-.114.223-.205.371-.388.533-.32.282-.602.352-.706.291-.084-.05-.131-.302-.114-.673.014-.316.089-.55.204-.924a36.261 36.261 0 0 0 1.2-5.416c.385-2.664.37-5.06-.201-6.52a2.224 2.224 0 0 0-.22-.427c-.062-.09-.106-.136-.106-.136-1.181-1.183-4.37-1.776-7.56-1.776-3.19 0-6.378.593-7.558 1.776 0 0-.045.045-.106.136a2.122 2.122 0 0 0-.221.426c-.572 1.46-.586 3.857-.201 6.521.26 1.807.672 3.72 1.227 5.504.096.307.158.516.173.84.016.369-.03.62-.114.67-.104.06-.389-.01-.71-.295-.23-.205-.345-.405-.49-.701-.68-1.385-1.393-3.397-1.667-5.323a18.884 18.884 0 0 1-.206-2.666c0-1.514.238-2.807.726-3.954.367-.86.983-1.58 1.782-2.083a13.892 13.892 0 0 1 6.526-2.122 13.9 13.9 0 0 1 .815-.026h.02c.274 0 .548.01.818.026 2.282.138 4.539.873 6.525 2.122a4.583 4.583 0 0 1 1.782 2.082zm-4.763 14.526c-.088.019-.361.083-.632.157-.243.067-.483.12-.597.143a16.51 16.51 0 0 1-3.115.285h-.028c-1.117 0-2.177-.103-3.114-.285a9.23 9.23 0 0 1-.56-.133 14.987 14.987 0 0 0-.604-.148c-.418-.095-.796-.163-.817-.083-.025.093.162.288.401.472.056.042.195.14.357.22.15.073.32.128.386.15 1.098.355 2.346.502 3.941.502h.022c1.563 0 2.794-.142 3.877-.483.371-.117.59-.211.853-.42.22-.174.385-.353.361-.44-.02-.075-.348-.021-.731.063zm-2.508-10.313c-.145-.81-.32-1.432-.518-1.85l-.002-.004h-.021l-.682-.006h-.01l-.027 2.998h1.426l-.001-.01c0-.005-.056-.522-.165-1.128zm5.76 1.687c-.322 2.228-.88 4.623-1.66 6.701-.13.35-.248.48-.53.7a6.23 6.23 0 0 1-2.431 1.028c-.897.175-1.908.272-2.974.272h-.029a15.66 15.66 0 0 1-2.973-.272 6.23 6.23 0 0 1-2.433-1.028c-.282-.22-.399-.35-.527-.7-.782-2.078-1.34-4.473-1.661-6.701-.373-2.577-.35-4.847.18-6.202.067-.17.138-.292.19-.369.046-.065.078-.1.078-.1 1.068-1.07 4.06-1.652 7.16-1.652 3.101 0 6.093.582 7.16 1.653 0 0 .032.033.078.1.052.076.124.197.19.368.531 1.355.554 3.625.182 6.202zM8.904 7.565L6.222 7.55l.267 9.337 1.122.012-.016-4.25h1.014v-1.097H7.595V8.66h1.31V7.564zm1.876-.02l-1.365.003.181 9.35h1.157l.027-9.352zm3.448.014h-2.732l.108 9.334h1.092l.009-4.222h1.418l.002.007c.128.797.138 4.171.138 4.205v.015h1.063l.009-.479c.048-2.42.13-6.469-1.107-8.86zm4.32-.013l-3.344.013v1.077h.998v.01l-.042 8.252h1.132l.275-8.262h.981v-1.09zM23.975 12c0 6.617-5.372 12-11.976 12C5.397 24 .025 18.617.025 12S5.397 0 12 0c6.604 0 11.976 5.383 11.976 12zm-.33-.008C23.64 5.561 18.418.33 11.998.33 5.642.33.46 5.463.358 11.811a1.71 1.71 0 0 1 .684-.78c.655-.388.834-1.385.893-1.981l.012-.062c-.039.395-.07.79-.07 1.218 0 .832.07 1.718.21 2.708.412 2.9 1.813 6.007 2.637 6.958l.046.05.192.202.007.006c2.01 1.647 3.857 2.23 7.061 2.23h.022c3.203 0 5.05-.583 7.06-2.23l.009-.006.185-.197.052-.056c.826-.954 2.226-4.057 2.638-6.957.14-.99.209-1.876.209-2.708 0-.454-.021-.89-.064-1.309l.006.006c.06.597.379 2.141.995 2.586.21.152.375.317.503.503z',
  },
  {
    label: 'Ford',
    query: 'Ford',
    iconPath:
      'M12 8.236C5.872 8.236.905 9.93.905 12.002S5.872 15.767 12 15.767c6.127 0 11.094-1.693 11.094-3.765 0-2.073-4.967-3.766-11.094-3.766zm-5.698 6.24c-.656.005-1.233-.4-1.3-1.101a1.415 1.415 0 0 1 .294-1.02c.195-.254.525-.465.804-.517.09-.017.213-.006.264.054.079.093.056.194-.023.234-.213.109-.47.295-.597.55a.675.675 0 0 0 .034.696c.263.397.997.408 1.679-.225.169-.156.32-.304.473-.48.3-.344.4-.47.8-1.024.005-.006.006-.014.004-.018-.003-.007-.009-.01-.02-.01-.267.007-.5.087-.725.255-.065.048-.159.041-.2-.021-.046-.07-.013-.163.062-.215.363-.253.76-.298 1.166-.367 0 0 .028.002.051-.03.167-.213.292-.405.47-.621.178-.22.41-.42.586-.572.246-.212.404-.283.564-.37.043-.022-.005-.049-.018-.049-.896-.168-1.827-.386-2.717-.056-.616.23-.887.718-.757 1.045.093.231.397.27.683.13a1.55 1.55 0 0 0 .611-.544c.087-.134.27-.038.171.195-.26.611-.757 1.097-1.363 1.118-.516.016-.849-.363-.848-.831.002-.924 1.03-1.532 2.11-1.622 1.301-.108 2.533.239 3.825.395.989.12 1.938.123 2.932-.106.118-.025.2.05.193.168-.01.172-.143.337-.47.516-.373.204-.763.266-1.17.27-.984.008-1.901-.376-2.85-.582.002.041.012.091-.023.117-.525.388-1 .782-1.318 1.334-.011.013-.005.025.013.024.277-.015.525-.022.783-.042.045-.004.047-.015.043-.048a.64.64 0 0 1 .2-.558c.172-.153.387-.17.53-.06.16.126.147.353.058.523a.63.63 0 0 1-.382.31s-.03.006-.026.034c.006.043.2.151.217.18.017.027.008.07-.021.102a.123.123 0 0 1-.095.045c-.033 0-.053-.012-.096-.035a.92.92 0 0 1-.27-.217c-.024-.031-.037-.032-.099-.029-.279.017-.714.059-1.009.096-.071.008-.082.022-.096.047-.47.775-.972 1.61-1.523 2.17-.592.6-1.083.758-1.604.762zM19.05 10.71c-.091.158-1.849 2.834-1.96 3.11-.035.088-.04.155-.004.204.092.124.297.051.425-.038.381-.262.645-.58.937-.858.017-.013.046-.018.065 0 .043.04.106.091.15.137a.04.04 0 0 1 .002.057 5.873 5.873 0 0 1-.904.911c-.47.364-.939.457-1.172.224a.508.508 0 0 1-.14-.316c-.002-.057-.031-.06-.058-.034-.278.275-.76.579-1.198.362-.366-.18-.451-.618-.383-.986.001-.008-.006-.06-.051-.03a1.28 1.28 0 0 1-.3.162.853.853 0 0 1-.366.077.518.518 0 0 1-.451-.253.759.759 0 0 1-.095-.347c-.001-.011-.017-.032-.033-.005-.3.457-.579.899-.875 1.363-.016.022-.03.036-.06.037l-.587.001c-.036 0-.053-.028-.034-.063.104-.2.674-1.03 1.06-1.736.107-.194.085-.294.019-.337-.083-.054-.248.027-.387.133-.379.287-.697.735-.859.935-.095.117-.185.291-.433.56-.391.425-.91.669-1.408.5a.848.848 0 0 1-.546-.58c-.015-.052-.044-.066-.073-.032-.08.1-.245.249-.383.342-.015.011-.052.033-.084.017a.851.851 0 0 1-.152-.199.07.07 0 0 1 .016-.08c.197-.173.305-.271.391-.38.064-.08.113-.17.17-.315.12-.302.393-.866.938-1.158a1.81 1.81 0 0 1 .652-.219c.1-.01.183.002.213.08.011.033.039.105.056.158.011.032.003.057-.035.071-.32.122-.643.311-.865.61-.253.338-.321.746-.152.98.123.17.322.2.514.139.29-.092.538-.363.666-.663.138-.329.16-.717.058-1.059-.016-.059-.001-.104.037-.136.077-.063.184-.112.215-.128a.14.14 0 0 1 .182.045c.106.157.163.378.17.607.006.049.026.05.05.025.19-.202.366-.418.568-.58.185-.147.422-.267.643-.262.286.006.428.2.419.546-.001.044.03.04.051.011a1.19 1.19 0 0 1 .24-.264c.198-.163.4-.236.611-.222.26.02.468.257.425.527a.53.53 0 0 1-.281.406.362.362 0 0 1-.405-.044.336.336 0 0 1-.096-.322c.005-.025-.027-.048-.054-.02-.254.264-.273.606-.107.76.183.17.458.056.658-.075.366-.239.65-.563.979-.813.218-.166.467-.314.746-.351a.87.87 0 0 1 .454.052c.2.081.326.25.342.396.004.043.036.048.063.01.158-.246 1.005-1.517 1.075-1.65.02-.041.044-.047.089-.047h.606c.035 0 .051.02.036.047zm-2.32 2.204a.053.053 0 0 0-.003.04c.003.02.03.04.056.05.01.003.015.01.004.032-.075.16-.143.252-.237.391a1.472 1.472 0 0 1-.3.325c-.178.147-.424.307-.628.2-.09-.047-.13-.174-.127-.276.004-.288.132-.584.369-.875.288-.355.607-.539.816-.438.216.103.148.354.05.55zm-5.949-1.881a.398.398 0 0 1 .132-.345c.057-.05.133-.062.18-.022.052.045.027.157-.026.234a.43.43 0 0 1-.245.177c-.018.004-.034-.004-.041-.044zM12 7.5C5.34 7.5 0 9.497 0 12c0 2.488 5.383 4.5 12 4.5s12-2.02 12-4.5-5.383-4.5-12-4.5zm0 8.608C5.649 16.108.5 14.27.5 12.002.5 9.733 5.65 7.895 12 7.895s11.498 1.838 11.498 4.107c0 2.268-5.148 4.106-11.498 4.106z',
  },
  {
    label: 'Volkswagen',
    query: 'Volkswagen',
    iconKind: 'volkswagen',
  },
  {
    label: 'BYD',
    query: 'BYD',
    iconKind: 'byd',
    iconViewBox: '0 0 48 24',
    iconWide: true,
  },
];

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, SearchHeaderComponent, VehicleCardComponent],
  template: `
    <main class="page home-page">
      <app-search-header
        [minimal]="true"
        [showFiltersAction]="false"
        [showMeta]="false"
        (search)="goToSearch($event)"
        (filters)="goToSearch({})"
      />

      <article class="home-hero">
        <span class="home-hero__eyebrow">Comece por aqui</span>
        <h2>Veja o anúncio, fale no chat e combine a retirada.</h2>
        <p>Escolha um tipo de veículo, filtre rápido e siga direto para o contato com quem anunciou.</p>

        <div class="home-hero__actions">
          <button
            type="button"
            class="btn btn-primary"
            (click)="goToSearch({ vehicleType: 'CAR' })"
          >
            Buscar carros
          </button>
          <button
            type="button"
            class="btn btn-secondary"
            (click)="goToSearch({ vehicleType: 'MOTORCYCLE' })"
          >
            Explorar motos
          </button>
        </div>
      </article>

      <section class="journey-strip" aria-label="Como funciona">
        <article>
          <strong>1</strong>
          <h3>Encontre</h3>
          <p>Use busca, marcas e filtros para achar o anúncio certo.</p>
        </article>
        <article>
          <strong>2</strong>
          <h3>Compare</h3>
          <p>Abra os detalhes, veja fotos e entenda o ponto de retirada.</p>
        </article>
        <article>
          <strong>3</strong>
          <h3>Converse</h3>
          <p>Chame no chat para alinhar disponibilidade e fechar o aluguel.</p>
        </article>
      </section>

      <section class="brands-section">
        <div class="section-title section-title--compact">
          <div>
            <span>Marcas</span>
            <h2>Ir por marca</h2>
          </div>
        </div>

        <div class="brands-rail">
          <button
            *ngFor="let brand of popularBrands"
            type="button"
            class="brand-chip"
            (click)="goToSearch({ q: brand.query })"
          >
            <span class="brand-chip__icon" aria-hidden="true">
              <svg
                [attr.viewBox]="brand.iconViewBox || '0 0 24 24'"
                focusable="false"
                [class.brand-chip__icon-svg--wide]="brand.iconWide"
              >
                <ng-container [ngSwitch]="brand.iconKind || 'path'">
                  <path
                    *ngSwitchCase="'path'"
                    [attr.d]="brand.iconPath"
                    fill="currentColor"
                  ></path>

                  <g
                    *ngSwitchCase="'volkswagen'"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.7"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <circle cx="12" cy="12" r="8.8"></circle>
                    <path
                      d="M7.55 7.45 10.45 12.1 12 9.35 13.55 12.1 16.45 7.45"
                    ></path>
                    <path
                      d="M6.7 8.45 9.9 16 12 12.35 14.1 16 17.3 8.45"
                    ></path>
                  </g>

                  <g *ngSwitchCase="'byd'">
                    <rect
                      x="2.75"
                      y="4.75"
                      width="42.5"
                      height="14.5"
                      rx="7.25"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    ></rect>
                    <text
                      x="24"
                      y="15.2"
                      text-anchor="middle"
                      font-size="10.5"
                      font-weight="800"
                      letter-spacing="1.2"
                      font-family="Panton Text, Sora, Arial, sans-serif"
                      fill="currentColor"
                    >
                      BYD
                    </text>
                  </g>
                </ng-container>
              </svg>
            </span>
            <span class="brand-chip__label">{{ brand.label }}</span>
          </button>
        </div>
      </section>

      <section class="section-title">
        <div>
          <span>Disponíveis</span>
          <h2>Em destaque</h2>
        </div>
        <a (click)="goToSearch({})">Ver todos os anúncios</a>
      </section>

      <section class="vehicle-grid">
        <app-vehicle-card
          *ngFor="let vehicle of featuredVehicles"
          [vehicle]="vehicle"
        />
      </section>
    </main>
  `,
  styles: [
    `
      .home-page {
        display: grid;
        gap: 20px;
        width: 100%;
        margin: 0 auto;
        padding: 20px 12px 40px;
      }

      .home-hero,
      .brands-section,
      .journey-strip article {
        position: relative;
        overflow: hidden;
        border-radius: 24px;
        border: 1px solid rgba(70, 89, 83, 0.08);
        box-shadow: var(--shadow-soft);
      }

      .home-hero {
        display: grid;
        gap: 12px;
        padding: 20px 18px;
        background: rgba(250, 253, 252, 0.96);
        color: var(--text-primary);
      }

      .home-hero h2 {
        margin: 0;
        max-width: 14ch;
        font-size: 34px;
        line-height: 0.98;
        color: var(--text-primary);
      }

      .home-hero p {
        margin: 0;
        max-width: 36ch;
        color: rgba(64, 84, 79, 0.76);
        line-height: 1.5;
      }

      .home-hero__eyebrow {
        display: inline-flex;
        width: fit-content;
        padding: 7px 12px;
        border-radius: 999px;
        background: #f1f7f4;
        border: 1px solid rgba(70, 89, 83, 0.08);
        color: #427a6d;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .home-hero__actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }

      .journey-strip {
        display: grid;
        gap: 12px;
      }

      .journey-strip article {
        display: grid;
        gap: 8px;
        padding: 18px;
        background: rgba(250, 253, 252, 0.96);
      }

      .journey-strip strong,
      .journey-strip h3,
      .journey-strip p {
        margin: 0;
      }

      .journey-strip strong {
        display: inline-grid;
        place-items: center;
        width: 34px;
        height: 34px;
        border-radius: 999px;
        background: rgba(88, 181, 158, 0.12);
        color: var(--primary);
      }

      .journey-strip h3 {
        color: var(--text-primary);
        font-size: 18px;
      }

      .journey-strip p {
        color: rgba(64, 84, 79, 0.76);
        line-height: 1.45;
      }

      .brands-section {
        display: grid;
        gap: 14px;
        padding: 18px;
        background: rgba(250, 253, 252, 0.96);
      }

      .section-title,
      .vehicle-grid {
        position: relative;
        z-index: 1;
      }

      .brands-rail {
        display: grid;
        grid-auto-flow: column;
        grid-auto-columns: 92px;
        gap: 12px;
        overflow-x: auto;
        padding-bottom: 2px;
      }

      .brand-chip {
        display: grid;
        justify-items: center;
        gap: 10px;
        padding: 0;
        border: 0;
        background: transparent;
        color: var(--text-primary);
        font: inherit;
      }

      .brand-chip__icon {
        display: grid;
        place-items: center;
        width: 78px;
        height: 78px;
        border-radius: 24px;
        background: linear-gradient(180deg, #eff6f3 0%, #dce8e3 100%);
        color: var(--primary);
        border: 1px solid rgba(103, 203, 176, 0.12);
        box-shadow: 0 16px 30px rgba(29, 41, 37, 0.08);
      }

      .brand-chip__icon svg {
        width: 30px;
        height: 30px;
      }

      .brand-chip__icon svg.brand-chip__icon-svg--wide {
        width: 38px;
        height: 20px;
      }

      .brand-chip__label {
        font-size: 12px;
        color: rgba(56, 76, 71, 0.88);
        font-weight: 700;
      }

      .section-title {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 12px;
      }

      .section-title--compact {
        align-items: center;
      }

      .section-title span {
        display: inline-flex;
        align-items: center;
        color: rgba(103, 203, 176, 0.72);
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.12em;
      }

      .section-title a {
        color: var(--primary);
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        text-decoration: none;
      }

      .section-title h2 {
        margin: 6px 0 0;
        font-size: 24px;
        color: var(--text-primary);
      }

      .home-page > .section-title span {
        color: rgba(55, 98, 87, 0.78);
      }

      .home-page > .section-title h2 {
        color: #26322f;
      }

      .vehicle-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 12px;
      }

      @media (min-width: 768px) {
        .home-page {
          gap: 22px;
          padding-bottom: 48px;
        }

        .home-hero {
          padding: 24px;
        }

        .journey-strip {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .vehicle-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }
      }

      @media (min-width: 1080px) {
        .home-page {
          gap: 24px;
          padding: 28px 20px 56px;
        }

        .home-hero {
          padding: 28px;
        }

        .home-hero h2 {
          font-size: 40px;
        }

        .brands-section {
          padding: 20px 18px;
        }

        .brands-rail {
          grid-auto-flow: initial;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          overflow: visible;
        }

        .brand-chip__icon {
          width: 84px;
          height: 84px;
          border-radius: 26px;
        }

        .vehicle-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }
      }
    `,
  ],
})
export class HomePageComponent {
  private readonly router = inject(Router);
  private readonly vehiclesApiService = inject(VehiclesApiService);

  protected readonly fallbackImage =
    'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80';
  protected readonly popularBrands = POPULAR_BRANDS.slice(0, 5);
  protected featuredVehicles: VehicleCardItem[] = [];

  constructor() {
    this.vehiclesApiService
      .search({ limit: 4 })
      .subscribe((response) => (this.featuredVehicles = response.items));
  }

  protected goToSearch(params: Record<string, string | undefined>) {
    this.router.navigate(['/search'], {
      queryParams: params,
    });
  }
}
